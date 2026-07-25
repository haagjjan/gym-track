# Gym Tracker Server Administration Tools

This document explains the deliberately managed administration, diagnostics, access, maintenance, and Apple T2 support tools on `gym-prod`. It is an operational reference, not an exhaustive manifest of every Ubuntu base library or transitive dependency. Exact package versions are recorded in the stage reports and can change during reviewed maintenance.

## General administration and file handling

- **`git`** — Retrieves and inspects source repositories and provides version-control tooling. It will be relevant when the deployment workflow is established, but no application repository has been deployed to the server yet.
- **`curl`** — Makes HTTP and HTTPS requests from the command line. It is useful for downloading small resources and testing service health endpoints.
- **`wget`** — Downloads files over HTTP, HTTPS, and FTP, with convenient support for resumable and recursive transfers.
- **`ca-certificates`** — Supplies the trusted certificate-authority bundle used to validate TLS certificates for HTTPS downloads and package repositories.
- **`gnupg`** — Verifies cryptographic signatures and manages OpenPGP keys, including repository-signing keys when an approved external package source requires one.
- **`jq`** — Filters, queries, and formats JSON output from APIs and command-line tools.
- **`rsync`** — Copies and synchronizes directory trees efficiently. It is suitable for controlled file transfers and later backup workflows, but does not itself define a backup policy.
- **`unzip`** — Extracts ZIP archives.
- **`zip`** — Creates ZIP archives.
- **`tree`** — Prints a directory hierarchy, making filesystem layouts easier to review.
- **`tmux`** — Provides persistent terminal sessions so a long-running administrative shell can survive a client disconnect.
- **`bash-completion`** — Adds context-aware command completion to Bash for supported tools.
- **`nano`** — Provides a straightforward interactive terminal text editor for emergency or local configuration work.
- **`cat`** — Prints or joins file contents and is commonly used for small read-only inspections.
- **`grep`** — Searches text using patterns; it remains useful in portable shell commands even though `ripgrep` is preferred for repository-scale searches.
- **`ripgrep` (`rg`)** — Searches files recursively with fast defaults and automatic respect for ignore files.

## Storage, process, and system diagnostics

- **`lsof`** — Shows which processes have files, devices, or network sockets open; it is particularly useful for attributing listening ports.
- **`ncdu`** — Provides an interactive terminal view of disk usage so unexpectedly large directories can be found quickly. Review paths carefully before deleting anything.
- **`smartmontools` (`smartctl`)** — Reads SSD/NVMe health, wear, temperature, and error information. The Apple NVMe controller may reject optional log pages even when its overall health check passes.
- **`htop`** — Provides an interactive process and resource monitor.
- **`btop`** — Provides a more graphical terminal overview of CPU, memory, disk, network, and process activity.
- **`needrestart`** — Reports services, sessions, or kernels that should be restarted after package upgrades; it does not authorize an automatic reboot.
- **`systemctl`** — Inspects and controls systemd services, sockets, timers, and targets.
- **`journalctl`** — Queries logs collected by systemd-journald.
- **`hostname`** — Reads or manages the system hostname; routine audits use it only to verify host identity.
- **`whoami`** — Prints the current effective user and helps confirm that an SSH session reached the intended account.
- **`findmnt`** — Displays mounted filesystems and their sources and options.
- **`lsblk`** — Shows block devices, partitions, filesystems, and mount points.
- **`df`** — Reports filesystem capacity and free space.
- **`free`** — Summarizes available and used system memory.
- **`sysctl`** — Reads and, when explicitly authorized, changes kernel runtime parameters such as packet forwarding.
- **`iptables` / `ip6tables`** — Inspect and manage the IPv4 and IPv6 packet-filtering chains used by UFW and Docker. Docker-published ports require Docker-aware review because they are not governed solely by ordinary UFW input rules.

## Network and DNS diagnostics

- **`bind9-dnsutils`** — Supplies DNS troubleshooting commands including `dig`, `host`, and `nslookup`; `dig` is the primary tool used to inspect resolver answers.
- **`traceroute`** — Shows the network hops toward a destination and helps diagnose routing-path problems.
- **`tcpdump`** — Captures and inspects network packets. Captures can contain sensitive traffic metadata and must not be committed to the repository.
- **`ethtool`** — Inspects Ethernet link state, speed, duplex, driver, and interface statistics.
- **`ip`** — Inspects and manages network addresses, links, neighbors, and routes through the iproute2 interface.
- **`ss`** — Lists network sockets and the processes using them; Stage audits use it to account for every listener.
- **`timedatectl`** — Displays system time, timezone, and synchronization state.

## Access, firewall, networking, and maintenance services

- **`openssh-server` (`sshd`)** — Provides encrypted remote administration over SSH. Access is intended for the `admin-gym` account with the established Ed25519 key.
- **`openssh-client` (`ssh`)** — Provides client-side SSH commands and supporting utilities. The MacBook uses it through the `gym-prod` and `gym-prod-wifi` aliases.
- **`openssh-sftp-server`** — Provides the server-side SFTP subsystem for encrypted file transfer through SSH.
- **`ufw`** — Manages the host firewall using a concise rule interface backed by the Linux firewall stack.
- **`NetworkManager` (`nmcli`)** — Manages the Ethernet and Wi-Fi interfaces, DHCP profiles, connection state, and route metrics.
- **`chrony` (`chronyd`)** — Keeps the system clock synchronized with network time sources.
- **`unattended-upgrades`** — Applies packages allowed by Ubuntu's unattended-upgrade policy. On `gym-prod`, automatic reboot and automatic unused-kernel removal are explicitly disabled.
- **`fstrim` / `fstrim.timer`** — Periodically informs the SSD which filesystem blocks are no longer used, helping preserve long-term storage performance.

## Build and package-maintenance support

- **`build-essential`** — Ubuntu meta-package for the standard C/C++ build toolchain, including the compiler and `make`; it may be required by software with native build steps.
- **`dkms`** — Rebuilds out-of-tree kernel modules when kernels change. Although currently marked automatically installed and no longer required, it is deliberately retained pending a T2 dependency review.
- **`software-properties-common`** — Supplies utilities for managing Ubuntu software sources. Its phased update was deferred during Stage 2.
- **`python3-software-properties`** — Provides Python support used by Ubuntu's software-properties tooling. Its phased update was deferred during Stage 2.

## Docker container platform

- **`docker-ce` (`dockerd`)** — Runs Docker Engine, including container lifecycle, image management, bridge networking, logging, and the local Docker API socket. The daemon is enabled at boot and is not exposed over a network socket.
- **`docker-ce-cli` (`docker`)** — Provides the command-line client for Docker Engine. On `gym-prod`, administrators invoke daemon operations with `sudo` because `admin-gym` is deliberately not a member of the root-equivalent `docker` group.
- **`containerd.io` (`containerd`, bundled `runc`)** — Provides the container lifecycle, image-content, snapshot, and low-level OCI runtime components used by Docker Engine.
- **`docker-buildx-plugin` (`docker buildx`)** — Extends Docker builds with BuildKit-based builders and multi-platform build features.
- **`docker-compose-plugin` (`docker compose`)** — Defines and operates related containers, networks, volumes, and port bindings from Compose YAML files.
- **`docker-ce-rootless-extras`** — Supplies optional helpers for running Docker in rootless mode. The package was installed as Docker's recommended dependency, but rootless Docker is not configured or enabled on this host.
- **`pigz`** — Compresses and decompresses gzip streams in parallel and is installed as a Docker package dependency to improve image-layer operations.
- **`docker-proxy`** — Implements user-space handling for published container ports when required. Stage 4 proved that its test listener was bound only to `127.0.0.1` and removed with the test container.

## Apple T2 support

- **`linux-t2`** — Tracks the T2-compatible kernel required by this Mac mini. It must not be replaced casually with a generic kernel.
- **`apple-firmware-script` (`get-apple-firmware`)** — Retrieves and installs Apple firmware needed by supported T2 hardware, including the internal wireless devices.
- **`apple-t2-audio-config`** — Supplies configuration needed for audio hardware behind the Apple T2 controller.
- **`dmg2img`** — Converts Apple DMG images and was used as part of the Apple firmware extraction workflow.

## Supporting packages installed in Stage 2

The Stage 2 installation of `needrestart` also installed `libintl-perl`, `libintl-xs-perl`, `libmodule-find-perl`, `libproc-processtable-perl`, `libsort-naturally-perl`, and `libterm-readkey-perl`. These are supporting Perl libraries used for localization, module discovery, process inspection, natural sorting, and terminal input; they are dependencies rather than tools administrators normally invoke directly.
