RASPI_TARGETS := embassyos-raspi.img embassyos-raspi.tar.gz gzip lite-upgrade.img
ARCH := $(shell if echo $(RASPI_TARGETS) | grep -qw "$(MAKECMDGOALS)"; then echo aarch64; else uname -m; fi)
OS_ARCH := $(shell if echo $(RASPI_TARGETS) | grep -qw "$(MAKECMDGOALS)"; then echo raspberrypi; else uname -m; fi)
ENVIRONMENT_FILE = $(shell ./check-environment.sh)
GIT_HASH_FILE = $(shell ./check-git-hash.sh)
VERSION_FILE = $(shell ./check-version.sh)
EMBASSY_BINS := backend/target/$(ARCH)-unknown-linux-gnu/release/embassyd backend/target/$(ARCH)-unknown-linux-gnu/release/embassy-init backend/target/$(ARCH)-unknown-linux-gnu/release/embassy-cli backend/target/$(ARCH)-unknown-linux-gnu/release/embassy-sdk backend/target/$(ARCH)-unknown-linux-gnu/release/avahi-alias libs/target/aarch64-unknown-linux-musl/release/embassy_container_init libs/target/x86_64-unknown-linux-musl/release/embassy_container_init
EMBASSY_UIS := frontend/dist/ui frontend/dist/setup-wizard frontend/dist/diagnostic-ui frontend/dist/install-wizard
BUILD_SRC := $(shell find build)
EMBASSY_SRC := backend/embassyd.service backend/embassy-init.service $(EMBASSY_UIS) $(BUILD_SRC)
COMPAT_SRC := $(shell find system-images/compat/ -not -path 'system-images/compat/target/*' -and -not -name *.tar -and -not -name target)
UTILS_SRC := $(shell find system-images/utils/ -not -name *.tar)
BINFMT_SRC := $(shell find system-images/binfmt/ -not -name *.tar)
BACKEND_SRC := $(shell find backend/src) $(shell find backend/migrations) $(shell find patch-db/*/src) $(shell find libs/*/src) libs/*/Cargo.toml backend/Cargo.toml backend/Cargo.lock
FRONTEND_SHARED_SRC := $(shell find frontend/projects/shared) $(shell ls -p frontend/ | grep -v / | sed 's/^/frontend\//g') frontend/package.json frontend/node_modules frontend/config.json patch-db/client/dist frontend/patchdb-ui-seed.json
FRONTEND_UI_SRC := $(shell find frontend/projects/ui)
FRONTEND_SETUP_WIZARD_SRC := $(shell find frontend/projects/setup-wizard)
FRONTEND_DIAGNOSTIC_UI_SRC := $(shell find frontend/projects/diagnostic-ui)
FRONTEND_INSTALL_WIZARD_SRC := $(shell find frontend/projects/install-wizard)
PATCH_DB_CLIENT_SRC := $(shell find patch-db/client -not -path patch-db/client/dist)
GZIP_BIN := $(shell which pigz || which gzip)
$(shell sudo true)

.DELETE_ON_ERROR:

.PHONY: all gzip install clean format sdk snapshots frontends ui backend

all: $(EMBASSY_SRC) $(EMBASSY_BINS) system-images/compat/docker-images/aarch64.tar system-images/utils/docker-images/$(ARCH).tar system-images/binfmt/docker-images/$(ARCH).tar $(ENVIRONMENT_FILE) $(GIT_HASH_FILE) $(VERSION_FILE)

gzip: embassyos-raspi.tar.gz

embassyos-raspi.tar.gz: embassyos-raspi.img
	tar --format=posix -cS -f- embassyos-raspi.img | $(GZIP_BIN) > embassyos-raspi.tar.gz

clean:
	rm -f 2022-01-28-raspios-bullseye-arm64-lite.zip
	rm -f raspios.img
	rm -f embassyos-raspi.img
	rm -f embassyos-raspi.tar.gz
	rm -f ubuntu.img
	rm -f product_key.txt
	rm -f system-images/**/*.tar
	rm -rf system-images/compat/target
	rm -rf backend/target
	rm -rf frontend/.angular
	rm -f frontend/config.json
	rm -rf frontend/node_modules
	rm -rf frontend/dist
	rm -rf libs/target
	rm -rf patch-db/client/node_modules
	rm -rf patch-db/client/dist
	rm -rf patch-db/target
	rm -rf cargo-deps
	rm ENVIRONMENT.txt
	rm GIT_HASH.txt
	rm VERSION.txt

format:
	cd backend && cargo +nightly fmt
	cd libs && cargo +nightly fmt

sdk:
	cd backend/ && ./install-sdk.sh

embassyos-raspi.img: all raspios.img cargo-deps/aarch64-unknown-linux-gnu/release/nc-broadcast cargo-deps/aarch64-unknown-linux-gnu/release/pi-beep
	! test -f embassyos-raspi.img || rm embassyos-raspi.img
	./build/raspberry-pi/make-image.sh

lite-upgrade.img: raspios.img cargo-deps/aarch64-unknown-linux-gnu/release/nc-broadcast cargo-deps/aarch64-unknown-linux-gnu/release/pi-beep $(BUILD_SRC) eos.raspberrypi.squashfs
	! test -f lite-upgrade.img || rm lite-upgrade.img
	./build/raspberry-pi/make-upgrade-image.sh

eos_raspberrypi.img: raspios.img $(BUILD_SRC) eos.raspberrypi.squashfs $(VERSION_FILE) $(ENVIRONMENT_FILE) $(GIT_HASH_FILE)
	! test -f eos_raspberrypi.img || rm eos_raspberrypi.img
	./build/raspberry-pi/make-initialized-image.sh

# For creating os images. DO NOT USE
install: all
	mkdir -p $(DESTDIR)/usr/bin
	cp backend/target/$(ARCH)-unknown-linux-gnu/release/embassy-init $(DESTDIR)/usr/bin/
	cp backend/target/$(ARCH)-unknown-linux-gnu/release/embassyd $(DESTDIR)/usr/bin/
	cp backend/target/$(ARCH)-unknown-linux-gnu/release/embassy-cli $(DESTDIR)/usr/bin/
	cp backend/target/$(ARCH)-unknown-linux-gnu/release/avahi-alias $(DESTDIR)/usr/bin/
	
	mkdir -p $(DESTDIR)/usr/lib
	rm -rf $(DESTDIR)/usr/lib/embassy
	cp -r build/lib $(DESTDIR)/usr/lib/embassy

	cp ENVIRONMENT.txt $(DESTDIR)/usr/lib/embassy/
	cp GIT_HASH.txt $(DESTDIR)/usr/lib/embassy/
	cp VERSION.txt $(DESTDIR)/usr/lib/embassy/

	mkdir -p $(DESTDIR)/usr/lib/embassy/container
	cp libs/target/aarch64-unknown-linux-musl/release/embassy_container_init $(DESTDIR)/usr/lib/embassy/container/embassy_container_init.arm64
	cp libs/target/x86_64-unknown-linux-musl/release/embassy_container_init $(DESTDIR)/usr/lib/embassy/container/embassy_container_init.amd64

	mkdir -p $(DESTDIR)/usr/lib/embassy/system-images
	cp system-images/compat/docker-images/aarch64.tar $(DESTDIR)/usr/lib/embassy/system-images/compat.tar
	cp system-images/utils/docker-images/$(ARCH).tar $(DESTDIR)/usr/lib/embassy/system-images/utils.tar
	cp system-images/binfmt/docker-images/$(ARCH).tar $(DESTDIR)/usr/lib/embassy/system-images/binfmt.tar

	mkdir -p $(DESTDIR)/var/www/html
	cp -r frontend/dist/diagnostic-ui $(DESTDIR)/var/www/html/diagnostic
	cp -r frontend/dist/setup-wizard $(DESTDIR)/var/www/html/setup
	cp -r frontend/dist/install-wizard $(DESTDIR)/var/www/html/install
	cp -r frontend/dist/ui $(DESTDIR)/var/www/html/main
	cp index.html $(DESTDIR)/var/www/html/

system-images/compat/docker-images/aarch64.tar: $(COMPAT_SRC)
	cd system-images/compat && make

system-images/utils/docker-images/aarch64.tar system-images/utils/docker-images/x86_64.tar: $(UTILS_SRC)
	cd system-images/utils && make

system-images/binfmt/docker-images/aarch64.tar system-images/binfmt/docker-images/x86_64.tar: $(BINFMT_SRC)
	cd system-images/binfmt && make

raspios.img:
	wget --continue https://downloads.raspberrypi.org/raspios_lite_arm64/images/raspios_lite_arm64-2022-01-28/2022-01-28-raspios-bullseye-arm64-lite.zip
	unzip 2022-01-28-raspios-bullseye-arm64-lite.zip
	mv 2022-01-28-raspios-bullseye-arm64-lite.img raspios.img

snapshots: libs/snapshot_creator/Cargo.toml
	cd libs/  && ./build-v8-snapshot.sh
	cd libs/  && ./build-arm-v8-snapshot.sh

$(EMBASSY_BINS): $(BACKEND_SRC) $(ENVIRONMENT_FILE) $(GIT_HASH_FILE) frontend/patchdb-ui-seed.json
	cd backend && ARCH=$(ARCH) ./build-prod.sh
	touch $(EMBASSY_BINS)

frontend/node_modules: frontend/package.json
	npm --prefix frontend ci

frontend/dist/ui: $(FRONTEND_UI_SRC) $(FRONTEND_SHARED_SRC) $(ENVIRONMENT_FILE)
	npm --prefix frontend run build:ui

frontend/dist/setup-wizard: $(FRONTEND_SETUP_WIZARD_SRC) $(FRONTEND_SHARED_SRC) $(ENVIRONMENT_FILE)
	npm --prefix frontend run build:setup

frontend/dist/diagnostic-ui: $(FRONTEND_DIAGNOSTIC_UI_SRC) $(FRONTEND_SHARED_SRC) $(ENVIRONMENT_FILE)
	npm --prefix frontend run build:dui

frontend/dist/install-wizard: $(FRONTEND_INSTALL_WIZARD_SRC) $(FRONTEND_SHARED_SRC) $(ENVIRONMENT_FILE)
	npm --prefix frontend run build:install-wiz

frontend/config.json: $(GIT_HASH_FILE) frontend/config-sample.json
	jq '.useMocks = false' frontend/config-sample.json > frontend/config.json
	jq '.packageArch = "$(ARCH)"' frontend/config.json > frontend/config.json.tmp
	jq '.osArch = "$(OS_ARCH)"' frontend/config.json.tmp > frontend/config.json
	rm frontend/config.json.tmp
	npm --prefix frontend run-script build-config

frontend/patchdb-ui-seed.json: frontend/package.json
	jq '."ack-welcome" = "$(shell yq '.version' frontend/package.json)"' frontend/patchdb-ui-seed.json > ui-seed.tmp
	mv ui-seed.tmp frontend/patchdb-ui-seed.json

patch-db/client/node_modules: patch-db/client/package.json
	npm --prefix patch-db/client ci

patch-db/client/dist: $(PATCH_DB_CLIENT_SRC) patch-db/client/node_modules
	! test -d patch-db/client/dist || rm -rf patch-db/client/dist
	npm --prefix frontend run build:deps

# used by github actions
backend-$(ARCH).tar: $(EMBASSY_BINS)
	tar -cvf $@ $^

# this is a convenience step to build all frontends - it is not referenced elsewhere in this file
frontends: $(EMBASSY_UIS) 

# this is a convenience step to build the UI
ui: frontend/dist/ui

# used by github actions
backend: $(EMBASSY_BINS)

cargo-deps/aarch64-unknown-linux-gnu/release/nc-broadcast:
	./build-cargo-dep.sh nc-broadcast

cargo-deps/aarch64-unknown-linux-gnu/release/pi-beep:
	./build-cargo-dep.sh pi-beep