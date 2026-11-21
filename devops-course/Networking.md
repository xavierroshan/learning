Here’s the same network with every device named, including the two pieces the original sketch left out: your ISP’s equipment and the LAN switch.

![](library-file\:fde1_bGliZmlsZV9rQ3hxS25Ud2NQdHZ1VDZSbWs1bXBR_FileDrive_fc98beb9c73c8191bcdca125cc9ba162)











### An analogy first

Think of the setup as an **office building**:

- The **internet** is the city’s postal system.

- The building has **one street address** that the outside world knows: `203.0.113.10`.

- Inside, every desk has an **internal room number** like `192.168.1.50`. These numbers mean nothing to the outside postal system.

- The **Linux router** is the building’s **mailroom and security desk**. Every letter in or out passes through it. It decides what’s allowed, and it rewrites addresses on envelopes so mail reaches the right desk and replies find their way back.

- The **switch** is the **internal hallway** connecting the desks to each other and to the mailroom.

Everything in your iptables script is the rulebook for that mailroom.

### Each piece of the diagram, top to bottom

#### 1. The internet (public addresses)

Every device directly on the internet has a **public IP address**, unique worldwide. Two are shown:

- **Customer, `198.51.100.7`:** someone at home who wants to visit your website.

- **Google, `142.250.1.1`:** any website your LAN users browse to.

Public addresses are routable: any internet router knows how to deliver a packet to them.

(The `203.0.113.x` and `198.51.100.x` ranges are reserved for documentation and examples, which is why tutorials use them. In real life, your ISP assigns your public address.)

#### 2. ISP modem / router

This is the box your internet provider installs, a cable modem, fibre ONT or DSL modem. It converts the provider’s line (coax, fibre, phone line) into ordinary Ethernet and hands traffic to your equipment.

The original sketch skipped it because, from your Linux router’s point of view, it’s just “the next hop toward the internet,” and your script never mentions it. In many home setups, the ISP box is put into **bridge mode** so it passes your public IP straight through to your own router, which is exactly the situation in this script.

#### 3. The Linux box: your router

This is the machine running your script, and it’s the centre of everything. It has **two network cards**, each plugged into a different network and each with its own address:

**`eth0`, the WAN side (Wide Area Network)**

- Plugged into the ISP modem.

- Holds the public address `203.0.113.10`.

- This is the **only address the outside world can see**. To the internet, your entire office is this one IP.

- In the script: `WAN=eth0` and `PUB_IP=203.0.113.10`.

**`eth1`, the LAN side (Local Area Network)**

- Plugged into the switch.

- Holds the private address `192.168.1.1`.

- Every LAN device is configured with this as its **default gateway**, meaning “when you need to reach anything outside 192.168.1.x, send it here.” On a laptop, you’d see it under network settings as “Router: 192.168.1.1.”

- In the script: `LAN=eth1`.

Inside the box, three jobs happen, all controlled by iptables and one kernel setting:

| <p>Job</p> | <p>What it does</p> | <p>Script lines</p> |
| - | - | - |
| **Routing** | Moves packets from one network card to the other | `sysctl -w net.ipv4.ip_forward=1` |
| **Firewall** | Decides which packets are allowed | INPUT and FORWARD rules, default DROP policies |
| **NAT** | Rewrites addresses so private devices can use the one public IP | MASQUERADE and DNAT rules |

**Why the word “router” is confusing.** In a typical home, one plastic box does everything: modem, router, firewall, NAT, switch and Wi-Fi. People call the whole thing “the router.” Here, those roles are split across separate devices, so you can see what each one does. Strictly, a router is the device that moves packets **between different networks**, and the Linux box is the only thing in this diagram doing that between your LAN and the internet.

#### 4. LAN switch / Wi-Fi access point

The switch connects all your local devices to each other and to the router’s `eth1`. It works one level lower than the router:

| | <p>Switch</p> | <p>Router</p> |
| - | - | - |
| Connects | Devices **within one network** | **Different networks** to each other |
| Works with | MAC addresses (hardware) | IP addresses |
| Example | Laptop → web server, both on 192.168.1.x | Laptop on 192.168.1.x → Google on the internet |
| Passes through iptables? | No | Yes |

That last row matters. When the laptop talks to the web server directly, both on 192.168.1.x, the packets go laptop → switch → web server. **They never touch the Linux router**, so your firewall rules don’t apply to them. Your script protects the LAN from the internet, not LAN devices from each other.

A Wi-Fi access point is effectively a wireless switch, so the phone connects the same way.

#### 5. The private LAN: 192.168.1.0/24

`192.168.1.0/24` means every address from `192.168.1.0` to `192.168.1.255`. The `/24` says the first three numbers (24 bits) identify the network and the last number identifies the device. In the script: `LAN_NET=192.168.1.0/24`.

`192.168.x.x` is one of the **private ranges** reserved for internal use (the others are `10.x.x.x` and `172.16–31.x.x`). Millions of homes and offices use exactly these same addresses. That’s why they can’t work on the internet: if a packet were addressed to “192.168.1.50,” nobody would know *which* of the millions of 192.168.1.50s you meant. NAT exists to solve this.

The devices:

- **Laptop, `192.168.1.50`** and **phone, `192.168.1.51`:** ordinary users browsing the web. They usually get their addresses automatically via DHCP.

- **Web server, `192.168.1.20`:** a machine running an HTTPS website on port 443. It’s the one internal device the public is allowed to reach. In the script: `WEB=192.168.1.20`. Servers usually get a fixed address so the port-forwarding rule always points at the right machine.

### How the script uses this layout

Here’s how each piece of the topology maps to what the script does.

#### Traffic flow 1: laptop browses Google (outbound)

```
Laptop ──► switch ──► eth1 ──[router]──► eth0 ──► ISP modem ──► Google
192.168.1.50                    MASQUERADE                    142.250.1.1
```

1. The laptop wants `142.250.1.1`. That’s not on 192.168.1.x, so it sends the packet to its gateway, `192.168.1.1`.

2. The switch delivers it to the router’s `eth1`.

3. The router routes it toward `eth0`. FORWARD checks it: from the LAN, going to the WAN, from a LAN address. Allowed.

4. On the way out of `eth0`, **MASQUERADE** replaces the source `192.168.1.50` with `203.0.113.10`. Google only ever sees the public IP.

5. Google replies to `203.0.113.10`. The router recognizes the reply as part of a known connection, restores the destination to `192.168.1.50`, and FORWARD allows it as ESTABLISHED.

The phone does exactly the same thing at the same time. The router keeps the conversations separate by tracking source ports, so replies reach the right device even though both share one public IP.

#### Traffic flow 2: customer visits your website (inbound)

```
Customer ──► ISP modem ──► eth0 ──[router]──► eth1 ──► switch ──► Web server
198.51.100.7                     DNAT                            192.168.1.20:443
```

1. The customer types `https://203.0.113.10`, the only address they can know.

2. The packet arrives on `eth0`. **DNAT** rewrites the destination from `203.0.113.10:443` to `192.168.1.20:443`. This is called **port forwarding**.

3. Routing now sees a LAN destination and sends it toward `eth1`. FORWARD checks it: from the internet, to the web server, port 443, new connection. Allowed. This is the single hole in your firewall.

4. The web server replies. The router restores the source to `203.0.113.10` on the way out, so the customer sees a reply from the address they contacted.

#### Traffic flow 3: someone attacks from the internet

- **Attacker → `203.0.113.10:22` (SSH into the router):** arrives on `eth0`, goes to INPUT. SSH is only allowed from `eth1`, so it’s dropped.

- **Attacker → `203.0.113.10:3389` (trying to reach a laptop):** there’s no DNAT rule for port 3389, so the packet stays addressed to the router, goes to INPUT, and is dropped.

- **Attacker pings `203.0.113.10`:** ping is only allowed from `eth1`. Dropped. The router appears to be offline.

Because of NAT, outsiders can’t even address the laptop or phone directly. The only internal machine reachable is the web server, and only on port 443.

#### Traffic flow 4: you manage the router

- **Laptop → `192.168.1.1:22`:** arrives on `eth1`, goes to INPUT, matches the LAN SSH rule. Allowed.

- **Laptop pings `192.168.1.1`:** matches the LAN ping rule. Allowed.

### The whole picture in one table

| <p>Element</p> | <p>Address</p> | <p>Role</p> | <p>Visible from internet?</p> | <p>Script variable</p> |
| - | - | - | - | - |
| Customer, Google | Public | Outside parties | Yes (they’re on it) | — |
| ISP modem | — | Connects you to your provider | — | — |
| Router `eth0` | `203.0.113.10` | Public face of the whole network | **Yes, the only one** | `WAN`, `PUB_IP` |
| Router `eth1` | `192.168.1.1` | Gateway for all LAN devices | No | `LAN` |
| Switch / Wi-Fi | — | Connects LAN devices locally | No | — |
| Laptop, phone | `192.168.1.50`, `.51` | Users; outbound only | No | covered by `LAN_NET` |
| Web server | `192.168.1.20` | Reachable on port 443 via port forward | Indirectly, via `203.0.113.10:443` | `WEB` |





# Linux router firewall explained

Oct 15, 2026 · @Roshan Xavier

A Linux router decides each packet's fate at a fixed series of checkpoints. Learn the checkpoints and every iptables rule becomes readable.

## The core idea

Think of the kernel as a building, and every packet as a visitor. Where the visitor is headed decides which corridor it walks and which guards it meets.

- A **chain** is one checkpoint (PREROUTING, INPUT, FORWARD, OUTPUT, POSTROUTING).

- A **table** is a type of guard working at that checkpoint.

Your script uses two types of guard:

| <p>Table</p> | <p>What it does</p> | <p>What it never does</p> |
| - | - | - |
| nat | Rewrites the address on the envelope | Block anything |
| filter | Lets the packet through or turns it away | Change anything |

There are two ways into the building:

- **Incoming traffic** arrives on a network card. It either ends at the router itself, or passes straight through to another network.

- **Traffic the router creates** (an SSH reply, an `apt update`) starts inside, at a local program.

## The packet's journey, stage by stage

Every packet passes the same stages in the same order. The only fork is the routing decision.

[embed: node/97a53be7-019f]

Incoming packets split at the routing decision; the router's own packets start at OUTPUT, and both outbound paths merge at POSTROUTING.

### 1. Packet arrives

The packet lands on `eth0` (internet) or `eth1` (LAN). Before your rules run, the kernel discards anything broken: bad checksums, malformed IP headers.

### 2. Connection tracking stamps the packet

At the start of PREROUTING (right after the rarely used raw table), **conntrack** looks the packet up in its table of known conversations. It stamps the packet with a state: NEW, ESTABLISHED, RELATED or INVALID. Every later rule that says `--ctstate` reads this stamp.

### 3. PREROUTING (nat): rewrite the destination

This is where DNAT (destination NAT, or port forwarding) happens. The rule in your script:

```bash
iptables -t nat -A PREROUTING -i eth0 -p tcp -d 203.0.113.10 --dport 443 \
         -j DNAT --to-destination 192.168.1.20:443
```

A customer's packet addressed to `203.0.113.10:443` is rewritten to `192.168.1.20:443`.

**Why DNAT must come before routing.** Routing decides a packet's path from its destination address. Left as `203.0.113.10`, the router's own address, the packet would be sent to INPUT, where nothing listens on port 443. Rewritten first, routing sees `192.168.1.20` and sends it to FORWARD, toward the LAN. DNAT changes the routing outcome, so it has to happen first.

### 4. Routing decision: for me, or passing through?

The kernel reads the (possibly rewritten) destination:

- One of the router's own addresses (`203.0.113.10`, `192.168.1.1`, `127.0.0.1`): the packet goes to **INPUT**.

- Anything else, with `ip_forward=1`: the packet goes to **FORWARD**. The routing table also picks the exit here: `192.168.1.x` leaves on `eth1`, everything else on `eth0`.

- Anything else, with forwarding off: dropped. That's why the script sets `ip_forward=1` first.

A packet visits INPUT **or** FORWARD, never both. Blocking a port in INPUT does nothing to traffic passing through.

### 5a. INPUT (filter): guarding the router itself

Only packets addressed to the router land here.

| <p>Rule</p> | <p>What it allows</p> |
| - | - |
| `-i lo` | The router talking to itself |
| `ESTABLISHED,RELATED` | Replies to things the router started, such as `apt update` |
| `-i eth1 --dport 22 NEW` | Your laptop opening SSH to the router |
| `-i eth1 icmp echo-request` | Your laptop pinging the router |

Everything else meets the INPUT policy of DROP. A bot scanning `203.0.113.10:22` from the internet is silently ignored.

### 5b. Local program

Accepted packets are handed to the program listening on that port, such as `sshd` on port 22. The packet's journey ends here.

### 5c. FORWARD (filter): guarding traffic passing through

Packets neither to nor from the router land here. In this setup, that's nearly all real traffic.

| <p>Rule</p> | <p>Example</p> |
| - | - |
| `-i eth1 -o eth0 -s 192.168.1.0/24` | Laptop to Google |
| `-i eth0 -o eth1 ESTABLISHED,RELATED` | Google's reply to the laptop |
| `-i eth0 -o eth1 -d 192.168.1.20 --dport 443 NEW` | Customer to web server, after DNAT |

Everything else meets the FORWARD policy of DROP. An outsider trying to reach a laptop's remote desktop on `192.168.1.50:3389` is blocked.

FORWARD sees the **already rewritten** destination. That's why its rule names `192.168.1.20`, not the public IP.

### 6. OUTPUT (filter): packets the router creates

Packets sent by local programs start here, not at "packet arrives": `sshd` replying to your laptop, the router running `apt update`, the router answering a ping.

The policy is `OUTPUT ACCEPT`, so the router may send anything. Stricter setups restrict this to stop a compromised router from contacting arbitrary servers.

### 7. POSTROUTING (nat): rewrite the source

This is the last stop, and both paths merge here: forwarded traffic and the router's own traffic. Its job is SNAT (source NAT). MASQUERADE is SNAT that automatically uses the outgoing interface's current address.

```bash
iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -o eth0 -j MASQUERADE
```

**Why SNAT must come after routing.** The rule says `-o eth0`: disguise LAN addresses only when leaving toward the internet. The exit interface isn't known until routing has chosen it.

An easy way to remember the order:

- **DNAT is early**, because the destination decides the route.

- **SNAT is late**, because the route decides whether to rewrite the source.

### 8. Packet leaves

The packet goes out on the chosen network card.

## NAT only looks at the first packet

NAT rules are evaluated only for the **first packet (NEW)** of each connection. When a DNAT or MASQUERADE rule matches that packet, conntrack records the translation. Every later packet in the conversation, in both directions, is translated from that record without consulting your nat rules again.

Two consequences:

- **You never write "reverse" NAT rules.** Nothing in the script changes a reply's source from `192.168.1.20` back to `203.0.113.10`. Conntrack does it automatically.

- **Editing a nat rule doesn't affect open connections.** Only new connections see it. Filter rules, by contrast, are checked on every packet.

## Three complete journeys

### Journey A: laptop (192.168.1.50) opens google.com

The request going out:

| <p>Stage</p> | <p>What happens</p> | <p>Source → destination</p> |
| - | - | - |
| Arrives on eth1 | Conntrack: NEW | 192.168.1.50 → 142.250.1.1:443 |
| PREROUTING | DNAT needs `-i eth0`; no match | unchanged |
| Routing | Not for me → FORWARD, exit eth0 | unchanged |
| FORWARD | LAN-to-WAN rule → ACCEPT | unchanged |
| POSTROUTING | MASQUERADE matches; translation recorded | **203.0.113.10** → 142.250.1.1:443 |
| Leaves eth0 | | |

Google's reply coming back:

| <p>Stage</p> | <p>What happens</p> | <p>Source → destination</p> |
| - | - | - |
| Arrives on eth0 | Conntrack: ESTABLISHED; un-masquerades automatically | 142.250.1.1 → **192.168.1.50** |
| Routing | Not for me → FORWARD, exit eth1 | |
| FORWARD | ESTABLISHED rule → ACCEPT | |
| POSTROUTING | Not NEW, so nat rules are skipped | |
| Leaves eth1 to the laptop | | |

### Journey B: customer (198.51.100.7) visits [https://203.0.113.10](https://203.0.113.10)

| <p>Stage</p> | <p>What happens</p> | <p>Source → destination</p> |
| - | - | - |
| Arrives on eth0 | Conntrack: NEW | 198.51.100.7 → 203.0.113.10:443 |
| PREROUTING | DNAT matches; translation recorded | 198.51.100.7 → **192.168.1.20**:443 |
| Routing | No longer for me → FORWARD, exit eth1 | |
| FORWARD | Web server port 443 rule → ACCEPT | |
| POSTROUTING | MASQUERADE needs `-o eth0`; no match | unchanged |
| Leaves eth1 to the web server | | |

The web server's reply returns through FORWARD as ESTABLISHED. Conntrack rewrites its source from `192.168.1.20` back to `203.0.113.10`, so the customer sees the address they contacted.

The web server sees the customer's **real** address, `198.51.100.7`, because no SNAT is applied. That keeps its logs useful.

### Journey C: your laptop opens SSH to the router

| <p>Stage</p> | <p>What happens</p> |
| - | - |
| Arrives on eth1, to 192.168.1.1:22 | Conntrack: NEW |
| PREROUTING | No DNAT match |
| Routing | Destination is my own address → INPUT |
| INPUT | "eth1, port 22, NEW" rule → ACCEPT |
| Local program | `sshd` receives it |
| sshd replies | Starts at OUTPUT → ACCEPT (policy) |
| POSTROUTING | Leaving eth1, so MASQUERADE doesn't match |
| Leaves eth1 to the laptop | |

This packet never touches FORWARD. The same SSH attempt from the internet, to `203.0.113.10:22`, also goes to INPUT, but no rule allows SSH on `eth0`, so the DROP policy discards it.

## The other tables

The script uses only nat and filter. The kernel has two more guards at most checkpoints, always in a fixed order:

| <p>Table</p> | <p>Purpose</p> | <p>Typical use</p> |
| - | - | - |
| raw | Runs before conntrack | Early drops; exempting high-volume traffic from tracking (NOTRACK) |
| mangle | Alters packet fields | Changing TTL, marking packets for traffic shaping or policy routing |
| nat | Rewrites addresses | DNAT, SNAT, MASQUERADE |
| filter | Allows or blocks | All INPUT, FORWARD and OUTPUT rules |

At PREROUTING the order is raw → conntrack → mangle → nat. At FORWARD it is mangle → filter. Most home and small-office firewalls never need raw or mangle.

## Common misconceptions

| <p>Misconception</p> | <p>Reality</p> |
| - | - |
| "I blocked port X in INPUT, so devices behind the router are protected." | Traffic to LAN devices goes through FORWARD and never touches INPUT. |
| "I need a rule to translate replies back." | Conntrack handles the reverse direction automatically. |
| "My FORWARD rule should use the public IP." | By FORWARD, DNAT has already rewritten the destination to the internal IP. |
| "OUTPUT ACCEPT means the router replies to everything." | OUTPUT only covers what local programs choose to send. Unsolicited traffic is stopped at INPUT, so the program never sees it and never replies. |

## Interfaces versus address ranges: $LAN and $LAN_NET

`$LAN` is a physical port; `$LAN_NET` is a range of addresses. Both are set at the top of the script, and bash substitutes them everywhere they appear:

```bash
LAN=eth1
LAN_NET=192.168.1.0/24
```

| <p>Variable</p> | <p>Value</p> | <p>What it is</p> | <p>Analogy</p> | <p>Used with</p> |
| - | - | - | - | - |
| `$LAN` | `eth1` | The router's LAN-side network card | Which door the visitor came through | `-i` (in-interface) |
| `$LAN_NET` | `192.168.1.0/24` | The LAN's block of IP addresses | The return address the visitor writes | `-s` (source), sometimes `-d` |

### $LAN: the interface

`eth1` is the card plugged into the LAN switch. Whether a packet arrived through it is a **physical fact** the sender can't fake. `-i eth1` ignores addresses entirely; it only asks which cable the packet came in on.

### $LAN_NET: the address range

The `/24` fixes the first three numbers (`192.168.1`) and lets the last one vary:

| <p>Address</p> | <p>Role</p> |
| - | - |
| 192.168.1.0 | Network address (not a device) |
| 192.168.1.1 | The router's eth1 (the gateway) |
| 192.168.1.20 | Web server |
| 192.168.1.50 | Laptop |
| 192.168.1.51 | Phone |
| 192.168.1.255 | Broadcast address (not a device) |

That leaves 254 usable addresses. Unlike the interface, a source address is **just a number in the packet**. The sender chooses it, and it can be forged.

### Why some rules check both

Together, the checks require a packet to be physically on the LAN **and** to use a legitimate LAN address. Each catches what the other misses:

| <p>Packet</p> | <p>Arrived on</p> | <p>Source</p> | <p>`-i $LAN` only</p> | <p>`-i $LAN -s $LAN_NET`</p> |
| - | - | - | - | - |
| Laptop asking DNS | eth1 | 192.168.1.50 | Accepted | Accepted |
| Internet attacker, real address | eth0 | 6.6.6.6 | Blocked | Blocked |
| Internet attacker, forged LAN address | eth0 | 192.168.1.50 | Blocked | Blocked |
| Misconfigured or malicious LAN device using an outside address | eth1 | 10.5.5.5 | **Accepted** | Blocked |

## LAN services on the router: DHCP and DNS

These three INPUT rules are needed **only if the router itself hands out addresses and answers name lookups** (often both done by `dnsmasq`). Without them, devices either get no address or can't resolve names.

### Rule 1: DHCP

```bash
iptables -A INPUT -i $LAN -p udp --sport 68 --dport 67 -j ACCEPT
```

| <p>Part</p> | <p>Meaning</p> |
| - | - |
| `-i $LAN` | Arrived on eth1 |
| `-p udp` | UDP (DHCP always uses UDP) |
| `--sport 68` | From the DHCP client port |
| `--dport 67` | To the DHCP server port |

**What DHCP does.** A device joining the network has no address yet. It broadcasts a request, and the DHCP server replies with something like: use `192.168.1.51`, your gateway is `192.168.1.1`, your DNS server is `192.168.1.1`.

**Why this rule has no `-s $LAN_NET`.** A device asking for an address doesn't have one, so it sends from `0.0.0.0` to the broadcast address:

```
Arrives on: eth1
SRC: 0.0.0.0:68          ← no address yet
DST: 255.255.255.255:67  ← broadcast to everyone
```

`0.0.0.0` isn't inside `192.168.1.0/24`. Requiring a LAN source would block exactly the packets DHCP depends on, and no new device could ever join. The interface check alone is sufficient.

### Rule 2: DNS over UDP

```bash
iptables -A INPUT -i $LAN -s $LAN_NET -p udp --dport 53 -j ACCEPT
```

**What DNS does.** It turns names into addresses. Before visiting `google.com`, the laptop asks the router for its IP:

```
Laptop:  SRC 192.168.1.50:51515 → DST 192.168.1.1:53     "What is google.com?"
Router:  SRC 192.168.1.1:53     → DST 192.168.1.50:51515  "142.250.1.1"
```

The question is allowed by this rule; the answer leaves through OUTPUT. Here `-s $LAN_NET` is used, because by the time a device asks DNS questions, DHCP has already given it an address.

**Why this matters for security.** A router that answers DNS questions from the internet is an "open resolver." Attackers send it small queries with a forged victim's address, and the router floods the victim with much larger answers. Requiring `-i $LAN` prevents this.

### Rule 3: DNS over TCP

```bash
iptables -A INPUT -i $LAN -s $LAN_NET -p tcp --dport 53 -m conntrack --ctstate NEW -j ACCEPT
```

Most DNS answers fit in one UDP packet. Large ones, such as many records or DNSSEC signatures, don't. The server then says "truncated, ask again over TCP," and the client retries on TCP port 53. Without this rule, those lookups fail and some sites mysteriously won't resolve.

**Why `--ctstate NEW` here but not in the UDP rule.** TCP has a handshake: only the first packet is NEW, and the rest is accepted by the earlier ESTABLISHED rule. UDP DNS queries are single packets, so the state check is commonly left out. Adding it would also be correct.

If devices use a public DNS server such as `1.1.1.1` directly, their queries pass **through** the router (FORWARD), and these INPUT rules aren't involved.

### The three rules in sequence

| <p>Step</p> | <p>What happens</p> | <p>Rule</p> | <p>Interface check</p> | <p>Address check</p> |
| - | - | - | - | - |
| 1 | Phone asks for an address from 0.0.0.0 | DHCP | eth1 | None (no address yet) |
| 2 | Router assigns 192.168.1.51, gateway and DNS 192.168.1.1 | Reply via OUTPUT | | |
| 3 | Phone asks "what is google.com?" over UDP | DNS UDP | eth1 | 192.168.1.0/24 |
| 4 | If the answer is large, it asks again over TCP | DNS TCP | eth1 | 192.168.1.0/24 |
| 5 | Phone connects to Google | FORWARD rules | | |

Without rule 1, the phone shows "connected, no internet." Without rules 2 and 3, it has an address but no names resolve, so browsing fails.

## The LAN-to-internet rule

```bash
iptables -A FORWARD -i $LAN -o $WAN -s $LAN_NET -m conntrack --ctstate NEW -j ACCEPT
```

In plain English: **allow devices on the private network to start new connections to the internet.** This one rule gives the LAN internet access.

### Word by word

After substitution, the kernel sees `-i eth1 -o eth0 -s 192.168.1.0/24`. All five conditions must hold at once; if any fails, the packet moves on down the chain.

| <p>Part</p> | <p>Question it answers</p> | <p>Why it's there</p> |
| - | - | - |
| `-A FORWARD` | Is the packet passing through the router? | Traffic to websites is addressed elsewhere, so it goes to FORWARD, never INPUT |
| `-i eth1` | Did it come in from the LAN side? | Packets from the internet can never match |
| `-o eth0` | Is it leaving toward the internet? | Limits the rule to LAN → internet; a future guest network or VPN on another interface stays unreachable |
| `-s 192.168.1.0/24` | Does it claim a LAN address? | Stops LAN devices with wrong or forged sources, and keeps the rule aligned with MASQUERADE, which only translates this range |
| `--ctstate NEW` | Is it starting a conversation? | Approves only the first packet; the ESTABLISHED rule handles the rest |

### How the work is divided

| <p>Rule</p> | <p>Handles</p> | <p>Example</p> |
| - | - | - |
| This rule (NEW) | Approving that a LAN device may start a connection | Laptop's first SYN to Google |
| `ESTABLISHED,RELATED` (earlier in the chain) | Everything after, in both directions | Google's SYN-ACK, the page data, later requests |

The original script had no `--ctstate NEW` here. It still worked, but adding it makes the design explicit and guarantees INVALID packets can never be accepted by this rule.

### Example: laptop's first packet to google.com

| <p>Step</p> | <p>What happens</p> | <p>Source → destination</p> |
| - | - | - |
| 1. Arrives on eth1 | Conntrack: NEW | 192.168.1.50:51000 → 142.250.1.1:443 |
| 2. PREROUTING | No DNAT match | unchanged |
| 3. Routing | Internet destination → FORWARD, exit eth0 | unchanged |
| 4. FORWARD, INVALID rule | Not INVALID → skip | |
| 5. FORWARD, ESTABLISHED rule | Not ESTABLISHED → skip | |
| 6. FORWARD, this rule | eth1, eth0, LAN source, NEW → ACCEPT | |
| 7. POSTROUTING | MASQUERADE rewrites the source; translation recorded | **203.0.113.10**:51000 → 142.250.1.1:443 |
| 8. Leaves eth0 | | |

Every later packet is ESTABLISHED and accepted earlier in the chain. For a page made of thousands of packets, this rule matches exactly once.

### What it does not allow

| <p>Attempt</p> | <p>Why it doesn't match</p> | <p>Result</p> |
| - | - | - |
| Internet → laptop, new connection | Arrived on eth0 | Dropped by policy |
| Internet → web server, port 443 | Arrived on eth0 | Allowed by the separate port-forward rule |
| Laptop → router's SSH | Addressed to the router, so INPUT | Handled by INPUT rules |
| Laptop → web server directly | Goes through the switch, never the router | Not filtered by the router |
| Laptop → web server via the public IP | Leaves on eth1, not eth0 | Allowed by the hairpin rule |
| LAN device with source 10.0.0.7 | Not in 192.168.1.0/24 | Dropped by policy |

### What breaks if each part is removed

| <p>Removed</p> | <p>Effect</p> |
| - | - |
| The whole rule | No internet for the LAN; devices show "connected, no internet" |
| `-i $LAN` | Matching packets from other interfaces could be forwarded; risky with more than two interfaces |
| `-o $WAN` | LAN devices could reach any network the router connects to |
| `-s $LAN_NET` | Wrong or forged sources get forwarded, possibly untranslated |
| `--ctstate NEW` | Still works, because the ESTABLISHED rule catches the rest; just less precise |

### Tightening it

The rule allows every outbound port and protocol, which is normal for homes and small offices. Rules are checked top to bottom and the first match wins, so blocks go **above** the general allow:

```bash
# Block direct email sending from the LAN (a common sign of spam malware)
iptables -A FORWARD -i $LAN -o $WAN -p tcp --dport 25 -j LOG_DROP

# Block one device from the internet entirely
iptables -A FORWARD -i $LAN -o $WAN -s 192.168.1.77 -j LOG_DROP

# Then the general allow
iptables -A FORWARD -i $LAN -o $WAN -s $LAN_NET -m conntrack --ctstate NEW -j ACCEPT
```

A strict environment can replace the general allow with a list of permitted services:

```bash
iptables -A FORWARD -i $LAN -o $WAN -s $LAN_NET -p tcp -m multiport --dports 80,443 \
         -m conntrack --ctstate NEW -j ACCEPT
iptables -A FORWARD -i $LAN -o $WAN -s $LAN_NET -p udp --dport 53 \
         -m conntrack --ctstate NEW -j ACCEPT
```

That allows only web browsing and DNS. It's more secure, but every new application on another port needs its own rule.