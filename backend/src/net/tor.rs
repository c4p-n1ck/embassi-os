use std::collections::BTreeMap;
use std::net::{Ipv4Addr, SocketAddr};

use clap::ArgMatches;
use color_eyre::eyre::eyre;
use futures::future::BoxFuture;
use futures::FutureExt;
use rpc_toolkit::command;
use sqlx::{Executor, Postgres};
use tokio::net::TcpStream;
use tokio::sync::Mutex;
use torut::control::{AsyncEvent, AuthenticatedConn, ConnError};
use torut::onion::{OnionAddressV3, TorSecretKeyV3};
use tracing::instrument;

use super::interface::{InterfaceId, TorConfig};
use crate::context::RpcContext;
use crate::s9pk::manifest::PackageId;
use crate::util::serde::{display_serializable, IoFormat};
use crate::{Error, ErrorKind, ResultExt as _};

#[test]
fn random_key() {
    println!("x'{}'", hex::encode(TorSecretKeyV3::generate().as_bytes()));
}

#[command(subcommands(list_services))]
pub fn tor() -> Result<(), Error> {
    Ok(())
}

fn display_services(services: Vec<OnionAddressV3>, matches: &ArgMatches) {
    use prettytable::*;

    if matches.is_present("format") {
        return display_serializable(services, matches);
    }

    let mut table = Table::new();
    for service in services {
        let row = row![&service.to_string()];
        table.add_row(row);
    }
    table.print_tty(false).unwrap();
}

#[command(rename = "list-services", display(display_services))]
pub async fn list_services(
    #[context] ctx: RpcContext,
    #[allow(unused_variables)]
    #[arg(long = "format")]
    format: Option<IoFormat>,
) -> Result<Vec<OnionAddressV3>, Error> {
    ctx.net_controller.tor.list_services().await
}

#[instrument(skip(secrets))]
pub async fn os_key<Ex>(secrets: &mut Ex) -> Result<TorSecretKeyV3, Error>
where
    for<'a> &'a mut Ex: Executor<'a, Database = Postgres>,
{
    let key = sqlx::query!("SELECT tor_key FROM account")
        .fetch_one(secrets)
        .await?
        .tor_key;

    let mut buf = [0; 64];
    buf.clone_from_slice(
        key.get(0..64).ok_or_else(|| {
            Error::new(eyre!("Invalid Tor Key Length"), crate::ErrorKind::Database)
        })?,
    );
    Ok(buf.into())
}

fn event_handler(_event: AsyncEvent<'static>) -> BoxFuture<'static, Result<(), ConnError>> {
    async move { Ok(()) }.boxed()
}

pub struct TorController(Mutex<TorControllerInner>);
impl TorController {
    pub async fn init(
        embassyd_addr: SocketAddr,
        embassyd_tor_key: TorSecretKeyV3,
        tor_control: SocketAddr,
    ) -> Result<Self, Error> {
        Ok(TorController(Mutex::new(
            TorControllerInner::init(embassyd_addr, embassyd_tor_key, tor_control).await?,
        )))
    }

    pub async fn add<I: IntoIterator<Item = (InterfaceId, TorConfig, TorSecretKeyV3)> + Clone>(
        &self,
        pkg_id: &PackageId,
        ip: Ipv4Addr,
        interfaces: I,
    ) -> Result<(), Error> {
        self.0.lock().await.add(pkg_id, ip, interfaces).await
    }

    pub async fn remove<I: IntoIterator<Item = InterfaceId> + Clone>(
        &self,
        pkg_id: &PackageId,
        interfaces: I,
    ) -> Result<(), Error> {
        self.0.lock().await.remove(pkg_id, interfaces).await
    }

    pub async fn embassyd_tor_key(&self) -> TorSecretKeyV3 {
        self.0.lock().await.embassyd_tor_key.clone()
    }

    pub async fn embassyd_onion(&self) -> OnionAddressV3 {
        self.0.lock().await.embassyd_onion()
    }

    pub async fn list_services(&self) -> Result<Vec<OnionAddressV3>, Error> {
        self.0.lock().await.list_services().await
    }
}

type AuthenticatedConnection = AuthenticatedConn<
    TcpStream,
    fn(AsyncEvent<'static>) -> BoxFuture<'static, Result<(), ConnError>>,
>;

#[derive(Clone, Debug, PartialEq, Eq)]
struct HiddenServiceConfig {
    ip: Ipv4Addr,
    cfg: TorConfig,
}

pub struct TorControllerInner {
    embassyd_addr: SocketAddr,
    embassyd_tor_key: TorSecretKeyV3,
    control_addr: SocketAddr,
    connection: Option<AuthenticatedConnection>,
    services: BTreeMap<(PackageId, InterfaceId), (TorSecretKeyV3, TorConfig, Ipv4Addr)>,
}
impl TorControllerInner {
    #[instrument(skip(self, interfaces))]
    async fn add<'a, I: IntoIterator<Item = (InterfaceId, TorConfig, TorSecretKeyV3)>>(
        &mut self,
        pkg_id: &PackageId,
        ip: Ipv4Addr,
        interfaces: I,
    ) -> Result<(), Error> {
        for (interface_id, tor_cfg, key) in interfaces {
            let id = (pkg_id.clone(), interface_id);
            match self.services.get(&id) {
                Some(k) if k.0 != key => {
                    self.remove(pkg_id, std::iter::once(id.1.clone())).await?;
                }
                Some(_) => continue,
                None => (),
            }
            self.connection
                .as_mut()
                .ok_or_else(|| {
                    Error::new(eyre!("Missing Tor Control Connection"), ErrorKind::Unknown)
                })?
                .add_onion_v3(
                    &key,
                    false,
                    false,
                    false,
                    None,
                    &mut tor_cfg
                        .port_mapping
                        .iter()
                        .map(|(external, internal)| {
                            (external.0, SocketAddr::from((ip, internal.0)))
                        })
                        .collect::<Vec<_>>()
                        .iter(),
                )
                .await?;
            self.services.insert(id, (key, tor_cfg, ip));
        }
        Ok(())
    }

    #[instrument(skip(self, interfaces))]
    async fn remove<I: IntoIterator<Item = InterfaceId>>(
        &mut self,
        pkg_id: &PackageId,
        interfaces: I,
    ) -> Result<(), Error> {
        for interface_id in interfaces {
            if let Some((key, _cfg, _ip)) = self.services.remove(&(pkg_id.clone(), interface_id)) {
                self.connection
                    .as_mut()
                    .ok_or_else(|| {
                        Error::new(eyre!("Missing Tor Control Connection"), ErrorKind::Tor)
                    })?
                    .del_onion(
                        &key.public()
                            .get_onion_address()
                            .get_address_without_dot_onion(),
                    )
                    .await?;
            }
        }
        Ok(())
    }

    #[instrument]
    async fn init(
        embassyd_addr: SocketAddr,
        embassyd_tor_key: TorSecretKeyV3,
        tor_control: SocketAddr,
    ) -> Result<Self, Error> {
        let mut conn = torut::control::UnauthenticatedConn::new(
            TcpStream::connect(tor_control).await?, // TODO
        );
        let auth = conn
            .load_protocol_info()
            .await?
            .make_auth_data()?
            .ok_or_else(|| eyre!("Cookie Auth Not Available"))
            .with_kind(crate::ErrorKind::Tor)?;
        conn.authenticate(&auth).await?;
        let mut connection: AuthenticatedConnection = conn.into_authenticated().await;
        connection.set_async_event_handler(Some(event_handler));

        let mut controller = TorControllerInner {
            embassyd_addr,
            embassyd_tor_key,
            control_addr: tor_control,
            connection: Some(connection),
            services: BTreeMap::new(),
        };
        controller.add_embassyd_onion().await?;
        Ok(controller)
    }

    #[instrument(skip(self))]
    async fn add_embassyd_onion(&mut self) -> Result<(), Error> {
        tracing::info!(
            "Registering Main Tor Service: {}",
            self.embassyd_tor_key.public().get_onion_address()
        );
        self.connection
            .as_mut()
            .ok_or_else(|| Error::new(eyre!("Missing Tor Control Connection"), ErrorKind::Tor))?
            .add_onion_v3(
                &self.embassyd_tor_key,
                false,
                false,
                false,
                None,
                &mut std::iter::once(&(self.embassyd_addr.port(), self.embassyd_addr)),
            )
            .await?;
        tracing::info!(
            "Registered Main Tor Service: {}",
            self.embassyd_tor_key.public().get_onion_address()
        );
        Ok(())
    }

    fn embassyd_onion(&self) -> OnionAddressV3 {
        self.embassyd_tor_key.public().get_onion_address()
    }

    #[instrument(skip(self))]
    async fn list_services(&mut self) -> Result<Vec<OnionAddressV3>, Error> {
        self.connection
            .as_mut()
            .ok_or_else(|| Error::new(eyre!("Missing Tor Control Connection"), ErrorKind::Tor))?
            .get_info("onions/current")
            .await?
            .lines()
            .map(|l| l.trim())
            .filter(|l| !l.is_empty())
            .map(|l| l.parse().with_kind(ErrorKind::Tor))
            .collect()
    }
}

#[tokio::test]
async fn test() {
    let mut conn = torut::control::UnauthenticatedConn::new(
        TcpStream::connect(SocketAddr::from(([127, 0, 0, 1], 9051)))
            .await
            .unwrap(), // TODO
    );
    let auth = conn
        .load_protocol_info()
        .await
        .unwrap()
        .make_auth_data()
        .unwrap()
        .ok_or_else(|| eyre!("Cookie Auth Not Available"))
        .with_kind(crate::ErrorKind::Tor)
        .unwrap();
    conn.authenticate(&auth).await.unwrap();
    let mut connection: AuthenticatedConn<
        TcpStream,
        fn(AsyncEvent<'static>) -> BoxFuture<'static, Result<(), ConnError>>,
    > = conn.into_authenticated().await;
    let tor_key = torut::onion::TorSecretKeyV3::generate();
    connection.get_conf("SocksPort").await.unwrap();
    connection
        .add_onion_v3(
            &tor_key,
            false,
            false,
            false,
            None,
            &mut [(443_u16, SocketAddr::from(([127, 0, 0, 1], 8443)))].iter(),
        )
        .await
        .unwrap();
    connection
        .add_onion_v3(
            &tor_key,
            false,
            false,
            false,
            None,
            &mut [(8443_u16, SocketAddr::from(([127, 0, 0, 1], 8443)))].iter(),
        )
        .await
        .unwrap();
}
