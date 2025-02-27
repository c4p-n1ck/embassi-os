use std::borrow::Borrow;
use std::sync::Arc;
use std::time::{Duration, Instant};

use basic_cookies::Cookie;
use color_eyre::eyre::eyre;
use digest::Digest;
use futures::future::BoxFuture;
use futures::FutureExt;
use http::StatusCode;
use rpc_toolkit::command_helpers::prelude::RequestParts;
use rpc_toolkit::hyper::header::COOKIE;
use rpc_toolkit::hyper::http::Error as HttpError;
use rpc_toolkit::hyper::{Body, Request, Response};
use rpc_toolkit::rpc_server_helpers::{
    noop4, to_response, DynMiddleware, DynMiddlewareStage2, DynMiddlewareStage3,
};
use rpc_toolkit::yajrc::RpcMethod;
use rpc_toolkit::Metadata;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use tokio::sync::Mutex;

use crate::context::RpcContext;
use crate::{Error, ResultExt};

pub const LOCAL_AUTH_COOKIE_PATH: &str = "/run/embassy/rpc.authcookie";

pub trait AsLogoutSessionId {
    fn as_logout_session_id(self) -> String;
}

/// Will need to know when we have logged out from a route
#[derive(Serialize, Deserialize)]
pub struct HasLoggedOutSessions(());

impl HasLoggedOutSessions {
    pub async fn new(
        logged_out_sessions: impl IntoIterator<Item = impl AsLogoutSessionId>,
        ctx: &RpcContext,
    ) -> Result<Self, Error> {
        let mut open_authed_websockets = ctx.open_authed_websockets.lock().await;
        let mut sqlx_conn = ctx.secret_store.acquire().await?;
        for session in logged_out_sessions {
            let session = session.as_logout_session_id();
            sqlx::query!(
                "UPDATE session SET logged_out = CURRENT_TIMESTAMP WHERE id = $1",
                session
            )
            .execute(&mut sqlx_conn)
            .await?;
            for socket in open_authed_websockets.remove(&session).unwrap_or_default() {
                let _ = socket.send(());
            }
        }
        Ok(HasLoggedOutSessions(()))
    }
}

/// Used when we need to know that we have logged in with a valid user
#[derive(Clone, Copy)]
pub struct HasValidSession(());

impl HasValidSession {
    pub async fn from_request_parts(
        request_parts: &RequestParts,
        ctx: &RpcContext,
    ) -> Result<Self, Error> {
        if let Some(cookie_header) = request_parts.headers.get(COOKIE) {
            let cookies = Cookie::parse(
                cookie_header
                    .to_str()
                    .with_kind(crate::ErrorKind::Authorization)?,
            )
            .with_kind(crate::ErrorKind::Authorization)?;
            if let Some(cookie) = cookies.iter().find(|c| c.get_name() == "local") {
                if let Ok(s) = Self::from_local(cookie).await {
                    return Ok(s);
                }
            }
            if let Some(cookie) = cookies.iter().find(|c| c.get_name() == "session") {
                if let Ok(s) = Self::from_session(&HashSessionToken::from_cookie(cookie), ctx).await
                {
                    return Ok(s);
                }
            }
        }
        Err(Error::new(
            eyre!("UNAUTHORIZED"),
            crate::ErrorKind::Authorization,
        ))
    }

    pub async fn from_session(session: &HashSessionToken, ctx: &RpcContext) -> Result<Self, Error> {
        let session_hash = session.hashed();
        let session = sqlx::query!("UPDATE session SET last_active = CURRENT_TIMESTAMP WHERE id = $1 AND logged_out IS NULL OR logged_out > CURRENT_TIMESTAMP", session_hash)
            .execute(&mut ctx.secret_store.acquire().await?)
            .await?;
        if session.rows_affected() == 0 {
            return Err(Error::new(
                eyre!("UNAUTHORIZED"),
                crate::ErrorKind::Authorization,
            ));
        }
        Ok(Self(()))
    }

    pub async fn from_local(local: &Cookie<'_>) -> Result<Self, Error> {
        let token = tokio::fs::read_to_string("/run/embassy/rpc.authcookie").await?;
        if local.get_value() == &*token {
            Ok(Self(()))
        } else {
            Err(Error::new(
                eyre!("UNAUTHORIZED"),
                crate::ErrorKind::Authorization,
            ))
        }
    }
}

/// When we have a need to create a new session,
/// Or when we are using internal valid authenticated service.
#[derive(Debug, Clone)]
pub struct HashSessionToken {
    hashed: String,
    token: String,
}
impl HashSessionToken {
    pub fn new() -> Self {
        let token = base32::encode(
            base32::Alphabet::RFC4648 { padding: false },
            &rand::random::<[u8; 16]>(),
        )
        .to_lowercase();
        let hashed = Self::hash(&token);
        Self { hashed, token }
    }
    pub fn from_cookie(cookie: &Cookie) -> Self {
        let token = cookie.get_value().to_owned();
        let hashed = Self::hash(&token);
        Self { hashed, token }
    }

    pub fn from_request_parts(request_parts: &RequestParts) -> Result<Self, Error> {
        if let Some(cookie_header) = request_parts.headers.get(COOKIE) {
            let cookies = Cookie::parse(
                cookie_header
                    .to_str()
                    .with_kind(crate::ErrorKind::Authorization)?,
            )
            .with_kind(crate::ErrorKind::Authorization)?;
            if let Some(session) = cookies.iter().find(|c| c.get_name() == "session") {
                return Ok(Self::from_cookie(session));
            }
        }
        Err(Error::new(
            eyre!("UNAUTHORIZED"),
            crate::ErrorKind::Authorization,
        ))
    }

    pub fn header_value(&self) -> Result<http::HeaderValue, Error> {
        http::HeaderValue::from_str(&format!(
            "session={}; Path=/; SameSite=Lax; Expires=Fri, 31 Dec 9999 23:59:59 GMT;",
            self.token
        ))
        .with_kind(crate::ErrorKind::Unknown)
    }

    pub fn hashed(&self) -> &str {
        self.hashed.as_str()
    }

    pub fn as_hash(self) -> String {
        self.hashed
    }
    fn hash(token: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        base32::encode(
            base32::Alphabet::RFC4648 { padding: false },
            hasher.finalize().as_slice(),
        )
        .to_lowercase()
    }
}
impl AsLogoutSessionId for HashSessionToken {
    fn as_logout_session_id(self) -> String {
        self.hashed
    }
}
impl PartialEq for HashSessionToken {
    fn eq(&self, other: &Self) -> bool {
        self.hashed == other.hashed
    }
}
impl Eq for HashSessionToken {}
impl PartialOrd for HashSessionToken {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        self.hashed.partial_cmp(&other.hashed)
    }
}
impl Ord for HashSessionToken {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.hashed.cmp(&other.hashed)
    }
}
impl Borrow<String> for HashSessionToken {
    fn borrow(&self) -> &String {
        &self.hashed
    }
}

pub fn auth<M: Metadata>(ctx: RpcContext) -> DynMiddleware<M> {
    let rate_limiter = Arc::new(Mutex::new((0_usize, Instant::now())));
    Box::new(
        move |req: &mut Request<Body>,
              metadata: M|
              -> BoxFuture<Result<Result<DynMiddlewareStage2, Response<Body>>, HttpError>> {
            let ctx = ctx.clone();
            let rate_limiter = rate_limiter.clone();
            async move {
                let mut header_stub = Request::new(Body::empty());
                *header_stub.headers_mut() = req.headers().clone();
                let m2: DynMiddlewareStage2 = Box::new(move |req, rpc_req| {
                    async move {
                        if let Err(e) = HasValidSession::from_request_parts(req, &ctx).await {
                            if metadata
                                .get(rpc_req.method.as_str(), "authenticated")
                                .unwrap_or(true)
                            {
                                let (res_parts, _) = Response::new(()).into_parts();
                                return Ok(Err(to_response(
                                    &req.headers,
                                    res_parts,
                                    Err(e.into()),
                                    |_| StatusCode::OK,
                                )?));
                            } else if rpc_req.method.as_str() == "auth.login" {
                                let guard = rate_limiter.lock().await;
                                if guard.1.elapsed() < Duration::from_secs(20) {
                                    if guard.0 >= 3 {
                                        let (res_parts, _) = Response::new(()).into_parts();
                                        return Ok(Err(to_response(
                                            &req.headers,
                                            res_parts,
                                            Err(Error::new(
                                                eyre!(
                                                "Please limit login attempts to 3 per 20 seconds."
                                            ),
                                                crate::ErrorKind::RateLimited,
                                            )
                                            .into()),
                                            |_| StatusCode::OK,
                                        )?));
                                    }
                                }
                            }
                        }
                        let m3: DynMiddlewareStage3 = Box::new(move |_, res| {
                            async move {
                                let mut guard = rate_limiter.lock().await;
                                if guard.1.elapsed() < Duration::from_secs(20) {
                                    if res.is_err() {
                                        guard.0 += 1;
                                    }
                                } else {
                                    guard.0 = 0;
                                }
                                guard.1 = Instant::now();
                                Ok(Ok(noop4()))
                            }
                            .boxed()
                        });
                        Ok(Ok(m3))
                    }
                    .boxed()
                });
                Ok(Ok(m2))
            }
            .boxed()
        },
    )
}
