Shell scripting lets you save Linux commands in a text file and run them as a repeatable program. Variables, decisions, loops, functions, and error handling turn individual commands into useful automation.

This guide uses **Bash**. Work through the examples in a practice directory using ordinary user permissions. By the end, you should be able to create scripts, process files and input, handle failures, and schedule repeatable tasks.

# What shell scripting means

The terminal is the interface where you type commands. The shell is the program that interprets those commands. Bash is one shell; others include sh, dash, zsh, and ksh. Linux distributions combine the Linux kernel with these and many other tools.

When you enter `date`, the shell runs that command. Saving several commands in a file creates a simple shell script:

```bash
date
whoami
pwd
```

Commands usually run in sequence unless your script uses conditions, loops, pipelines, or background execution to control them. Different shells support different features: run the Bash examples in this guide with Bash.

# Purpose and practical uses

Shell scripting automates work that would otherwise require repeatedly typing commands. It is especially useful for connecting existing command-line tools.

| Area | Examples |
| --- | --- |
| Files and directories | Create folders, rename files, organize documents |
| Backups | Compress directories, copy archives, check results |
| System administration | Check storage, inspect processes, manage services |
| Logs | Search errors, count events, generate summaries |
| Development | Build projects, run tests, prepare releases |
| Deployment | Copy application files and run deployment commands |
| Networking | Call APIs, check connectivity, transfer files |
| Text processing | Filter, sort, combine, and transform text |
| Scheduled work | Generate reports or run periodic maintenance |
| Batch processing | Apply an operation to many files |

A backup script can check a source folder, create an archive with a timestamp, check the result, and record what happened. For large applications, complex data structures, or substantial numerical processing, a language such as Python is usually easier to maintain.

# Linux commands and paths to know

| Command | Purpose |
| --- | --- |
| `pwd`, `ls`, `cd` | Show location, list contents, change directory |
| `mkdir` | Create directories |
| `cp`, `mv`, `rm` | Copy, move or rename, remove |
| `cat`, `less` | Print or browse text |
| `head`, `tail` | Show the beginning or end of a file |
| `grep`, `find` | Search text or locate files |
| `sort`, `uniq`, `wc` | Sort, process repeated lines, count |
| `cut`, `awk`, `sed` | Extract or transform text |
| `chmod` | Change permissions |
| `ps`, `df`, `du` | Inspect processes and storage usage |
| `tar` | Create or extract archives |
| `man` | Read command documentation |

```bash
pwd
ls -la
mkdir -p practice/reports
grep -n 'ERROR' application.log
df -h
```

Paths determine where commands operate:

```bash
/etc/hosts       # Absolute path, starting at /
./report.txt     # Relative to the current directory
../report.txt    # Relative to the parent directory
"$HOME/reports"  # A directory inside your home directory
```

# Create and run your first script

Create a practice folder and open a file in a text editor:

```bash
mkdir -p "$HOME/shell-practice"
cd "$HOME/shell-practice"
nano hello.sh
```

Enter this content:

```bash
#!/usr/bin/env bash

# Print a greeting and basic information.
printf 'Hello, Linux!\n'
printf 'Current user: %s\n' "$(whoami)"
printf 'Current directory: %s\n' "$PWD"
```

In Nano, press Ctrl+O and Enter to save, then Ctrl+X to exit. Run the script with Bash:

```bash
bash hello.sh
```

Alternatively, give the owner execute permission and run it directly:

```bash
chmod u+x hello.sh
./hello.sh
```

The first line is the **shebang**. When the script is executed directly, `#!/usr/bin/env bash` selects Bash using the command search path. `#!/bin/bash` instead selects Bash at that exact location. Running `bash hello.sh` explicitly chooses Bash regardless of the shebang.

The `.sh` extension is a convention, not a requirement. `./` means the current directory. A comment starts with `#` where shell syntax permits it; a `#` inside quoted text is literal text.

Do not run Bash-specific scripts with `sh hello.sh`: `sh` may be a different shell.

# Variables and quoting

Variables store values. Assignment has no spaces around the equals sign:

```bash
name="Asha"
course="Linux"
count=3

printf '%s is learning %s.\n' "$name" "$course"
printf 'Practice sessions: %s\n' "$count"
printf 'Report name: %s\n' "${name}_report.txt"
```

`name="Asha"` is an assignment. `name = "Asha"` tries to run a command named `name` and is incorrect for assignment.

| Quoting | Meaning |
| --- | --- |
| Single quotes | Preserve literal text without variable expansion |
| Double quotes | Preserve spaces while allowing variable and command expansion |
| Backslash | Escape a character where shell syntax permits it |

```bash
name="Asha"
printf '%s\n' "$name"   # Asha
printf '%s\n' '$name'   # Literal $name

file="monthly report.txt"
cat -- "$file"
```

Usually, double-quote variable expansions. Without quotes, the shell can split a value into multiple arguments and expand wildcard characters. Use a fixed format with `printf`, such as `printf '%s\n' "$value"`, instead of treating a variable as the format string. See the [Bash quoting reference](https://www.gnu.org/software/bash/manual/html_node/Quoting.html) for the precise rules.

# Read interactive input

```bash
#!/usr/bin/env bash

read -r -p "Enter your name: " name
printf 'Hello, %s!\n' "$name"
```

`-r` preserves backslashes; `-p` displays a prompt. For hidden input:

```bash
read -r -s -p "Enter password: " password
printf '\n'
```

Hidden input prevents terminal echo. Avoid printing or logging secrets, including through debugging traces.

# Arguments and special parameters

Arguments let you reuse a script without interactive prompts. Save this as `greet.sh`:

```bash
#!/usr/bin/env bash

if (( $# != 2 )); then
    printf 'Usage: %s NAME CITY\n' "$0" >&2
    exit 1
fi

name=$1
city=$2
printf 'Hello, %s from %s!\n' "$name" "$city"
```

Run it with two arguments:

```bash
bash greet.sh "Asha Kumar" "New Delhi"
```

| Parameter | Meaning |
| --- | --- |
| `$0` | Script name or invocation path |
| `$1`, `$2` | First and second arguments |
| `${10}` | Tenth argument |
| `$#` | Number of arguments |
| `"$@"` | All arguments, preserving each as a separate argument |
| `$?` | Exit status of the previous command |
| `$$` | Current shell process ID |
| `$!` | Process ID of the most recent background command |

```bash
for argument in "$@"; do
    printf 'Argument: %s\n' "$argument"
done
```

Use `"$@"` when forwarding arguments. `"$*"` instead combines them into one word using the first character of `IFS` as the separator; it is useful for simple log messages but not general argument forwarding.

# Command substitution and arithmetic

Command substitution captures standard output:

```bash
today=$(date +%F)
current_user=$(whoami)

printf 'Date: %s\n' "$today"
printf 'User: %s\n' "$current_user"
```

`$(...)` removes trailing newlines from the captured output. It does not capture standard error unless you redirect it.

Use `$((...))` for integer calculations:

```bash
a=10
b=3

printf 'Sum: %s\n' "$((a + b))"
printf 'Difference: %s\n' "$((a - b))"
printf 'Product: %s\n' "$((a * b))"
printf 'Integer division: %s\n' "$((a / b))"
printf 'Remainder: %s\n' "$((a % b))"
```

Bash uses integer arithmetic: `10 / 3` gives `3`. Use tools such as `awk` or `bc` for decimal calculations. Validate numeric input before using it in arithmetic.

# Decisions and conditions

`if`, `elif`, and `else` choose which commands to run:

```bash
#!/usr/bin/env bash

read -r -p "Enter a whole number from 0 to 100: " number

if [[ ! $number =~ ^(0|[1-9][0-9]?|100)$ ]]; then
    printf 'Enter a whole number from 0 to 100.\n' >&2
    exit 1
fi

if (( number > 50 )); then
    printf 'Above 50\n'
elif (( number == 50 )); then
    printf 'Exactly 50\n'
else
    printf 'Below 50\n'
fi
```

Use `[[ ... ]]` for Bash string and file conditions, and `(( ... ))` for arithmetic conditions:

```bash
[[ "$name" == "Asha" ]]  # Equal strings
[[ "$name" != "Asha" ]]  # Different strings
[[ -z "$name" ]]         # Empty string
[[ -n "$name" ]]         # Nonempty string

(( count >= 3 ))          # Numeric comparison
```

| File test | Meaning |
| --- | --- |
| `-e "$path"` | Path exists |
| `-f "$path"` | Refers to a regular file |
| `-d "$path"` | Refers to a directory |
| `-r "$path"` | Readable by the current user |
| `-w "$path"` | Writable by the current user |
| `-x "$path"` | Executable or directory-searchable by the current user |
| `-s "$path"` | File size is greater than zero |
| `-L "$path"` | Is a symbolic link |

```bash
if [[ -f "$file" && -r "$file" ]]; then
    cat -- "$file"
fi
```

`&&` means AND, `||` means OR, and `!` negates a condition. Older portable scripts often use `[ ... ]`; spaces around its arguments and closing bracket are required. Its rules differ from `[[ ... ]]`. See [Bash conditional constructs](https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html).

# Exit statuses and command chaining

Commands report an exit status. Zero means success; nonzero means failure or another command-specific outcome. `grep`, for example, returns `1` for no matches.

```bash
mkdir reports
status=$?
printf 'Exit status: %s\n' "$status"
```

Capture `$?` immediately because the next command replaces it. Usually, checking the command directly is clearer:

```bash
if mkdir reports; then
    printf 'Directory created.\n'
else
    printf 'Could not create directory.\n' >&2
fi
```

Outside conditional expressions, command lists can also use AND and OR:

```bash
mkdir -p reports && printf 'Directory is ready.\n'

command -v tar >/dev/null 2>&1 || {
    printf 'tar is required.\n' >&2
    exit 1
}
```

`A && B` runs B only if A succeeds. `A || B` runs B only if A fails. `exit 0` ends a script successfully; `exit 1` ends it with an error status.

# Loops and file processing

Use `for` for a list of values:

```bash
for name in Asha Ben Carlos; do
    printf 'Hello, %s!\n' "$name"
done

for ((i = 1; i <= 5; i++)); do
    printf 'Number: %s\n' "$i"
done
```

Process matching files:

```bash
for file in ./*.txt; do
    [[ -f "$file" ]] || continue
    printf 'Found: %s\n' "$file"
done
```

The file check also handles no matching files. A wildcard such as `*.txt` is a filename pattern, not a regular expression. Ordinary `*` patterns do not include leading-dot filenames unless shell options or the pattern explicitly allow them.

`while` repeats while a condition succeeds; `until` repeats until it succeeds:

```bash
count=1
while (( count <= 3 )); do
    printf 'Attempt %s\n' "$count"
    count=$((count + 1))
done

count=1
until (( count > 3 )); do
    printf 'Count: %s\n' "$count"
    count=$((count + 1))
done
```

`break` leaves the loop; `continue` skips the remainder of the current iteration. Read a file without stripping spaces or interpreting backslashes:

```bash
while IFS= read -r line || [[ -n "$line" ]]; do
    printf 'Line: %s\n' "$line"
done < notes.txt
```

The extra condition handles a final line without a terminating newline.

# Choose actions with case

`case` is useful for menus and script subcommands:

```bash
#!/usr/bin/env bash

action=${1:-help}

case "$action" in
    start)
        printf 'Starting the task...\n'
        ;;
    stop)
        printf 'Stopping the task...\n'
        ;;
    status)
        printf 'Checking status...\n'
        ;;
    help)
        printf 'Usage: %s {start|stop|status}\n' "$0"
        ;;
    *)
        printf 'Unknown action: %s\n' "$action" >&2
        exit 1
        ;;
esac
```

`${1:-help}` supplies `help` if the first argument is unset or empty. Run the example with `bash task.sh status`. These branches print demonstration messages; they do not control a real service.

# Functions

Functions group reusable behavior:

```bash
log() {
    printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

greet() {
    local name=$1
    printf 'Hello, %s!\n' "$name"
}

log "Script started"
greet "Asha"
log "Script finished"
```

Inside a function, `$1`, `$2`, and `"$@"` refer to that function's arguments. `local` creates a function-local variable. `return` reports a status; it does not return a text value. To obtain text, capture output:

```bash
make_filename() {
    printf 'report-%s.txt\n' "$(date +%F)"
}

filename=$(make_filename)
printf '%s\n' "$filename"
```

# Arrays and parameter expansion

Arrays preserve multiple separate values, including values containing spaces:

```bash
files=("first report.txt" "second report.txt" "notes.txt")

printf 'First file: %s\n' "${files[0]}"
printf 'Number of files: %s\n' "${#files[@]}"

for file in "${files[@]}"; do
    printf '%s\n' "$file"
done
```

Indexed arrays start at zero. Use `"${files[@]}"` to preserve elements as separate arguments. Bash also supports associative arrays for key-value mappings; these require Bash 4 or newer.

Parameter expansion handles defaults and simple string operations:

```bash
name=${1:-Guest}                # Default if unset or empty
length=${#name}                 # String length

path="/var/log/application.log"
filename=${path##*/}            # application.log
stem=${filename%.log}           # application
```

# Input and output redirection

| Stream | Number | Usual destination |
| --- | --- | --- |
| Standard input | 0 | Terminal input |
| Standard output | 1 | Terminal output |
| Standard error | 2 | Terminal output |

```bash
date > report.txt             # Write, replacing existing contents
date >> report.txt            # Append
sort < names.txt              # Read input from a file
command 2> errors.log         # Save standard error
command > output.log 2>&1      # Save output and errors together
command >/dev/null 2>&1        # Discard both streams
```

`command` in these redirection examples stands for the program you want to run. **The `>` operator truncates an existing output file**, so use it intentionally.

Redirection order matters: `> output.log 2>&1` first redirects standard output, then sends standard error to the same destination. Reversing the order produces a different result.

A here-document supplies multiline input:

```bash
cat > settings.conf <<'EOF'
mode=development
log_level=info
EOF
```

Quoting `'EOF'` prevents variable and command expansion inside the here-document.

# Pipes and text tools

A pipe connects one command's standard output to another command's standard input:

```bash
grep 'ERROR' application.log | sort | uniq -c
```

This selects matching lines, sorts them, then counts identical adjacent lines. Standard error is not sent through an ordinary pipe.

Other useful patterns:

```bash
wc -l < application.log           # Count newline characters
cut -d: -f1 /etc/passwd            # Extract a colon-separated field
awk '{print $1}' access.log        # Print first whitespace-separated field
sed 's/old/new/g' input.txt        # Print text with replacements
```

The `sed` example does not modify the original file. Use format-aware tools for structured data, such as `jq` for JSON when installed. Splitting CSV on commas does not correctly handle quoted commas or embedded newlines.

# Error handling and cleanup

By default, a pipeline's exit status comes from its last command. Enable `pipefail` to report failure when an earlier component fails:

```bash
set -o pipefail
```

You will often encounter:

```bash
set -euo pipefail
```

| Setting | Effect |
| --- | --- |
| `-e` | Exit after certain unhandled command failures |
| `-u` | Treat many uses of unset variables as errors |
| `pipefail` | Make pipeline failure account for failing components |

These options do not replace deliberate error handling. In particular, `-e` has exceptions in conditions, command lists, and other contexts.

```bash
if cp -- "$source" "$destination"; then
    printf 'Copy completed.\n'
else
    printf 'Copy failed.\n' >&2
    exit 1
fi
```

Use `trap` to clean up a temporary directory when the script exits:

```bash
#!/usr/bin/env bash

temp_dir=$(mktemp -d) || exit 1

cleanup() {
    rm -rf -- "$temp_dir"
}

trap cleanup EXIT
printf 'Temporary work\n' > "$temp_dir/data.txt"
```

The removal is limited to the temporary directory created for this script. Cleanup traps cannot run after an uncatchable termination such as SIGKILL or a power loss.

# Environment and working directories

Environment variables pass settings to programs:

```bash
printf 'Home: %s\n' "$HOME"
printf 'Search path: %s\n' "$PATH"

export APP_MODE="development"
bash child-script.sh

APP_MODE=development bash child-script.sh
```

`export` makes a variable available to child processes. An assignment before a command applies to that command's environment.

A normally executed script runs in a separate process. Its variable and directory changes do not change the parent shell. By contrast:

```bash
source ./settings.sh
```

executes the file in the current shell and can change its variables, functions, directory, and options. Source only trusted files; a sourced file contains executable code.

Relative paths usually start from the directory where the script was launched, not the directory containing the script. For resources beside a Bash script:

```bash
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd) || exit 1
config_file="$script_dir/settings.conf"
```

This common pattern does not resolve every symbolic-link arrangement.

# Complete directory backup example

Save the following as `backup.sh`. It validates arguments, checks a dependency, creates a uniquely named archive, logs progress, and removes an incomplete archive if archiving fails. It uses GNU `mktemp` options available on typical Linux systems.

**Choose a backup directory outside the source directory** so the archive is not included in its own input.

```bash
#!/usr/bin/env bash

set -u
set -o pipefail

log() {
    printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

if (( $# != 2 )); then
    printf 'Usage: %s SOURCE_DIRECTORY BACKUP_DIRECTORY\n' "$0" >&2
    exit 1
fi

source_dir=$1
backup_dir=$2

if [[ ! -d "$source_dir" ]]; then
    printf 'Source directory does not exist: %s\n' "$source_dir" >&2
    exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
    printf 'Required command is unavailable: tar\n' >&2
    exit 1
fi

if ! mkdir -p -- "$backup_dir"; then
    printf 'Could not create backup directory: %s\n' "$backup_dir" >&2
    exit 1
fi

archive=$(mktemp -- \
    "$backup_dir/backup-$(date '+%Y%m%d-%H%M%S')-XXXXXX.tar.gz") || {
    printf 'Could not create the archive file.\n' >&2
    exit 1
}

log "Backing up: $source_dir"

if tar -czf "$archive" -C "$source_dir" .; then
    log "Backup created: $archive"
else
    printf 'Backup failed; removing incomplete archive.\n' >&2
    rm -f -- "$archive"
    exit 1
fi
```

Run it:

```bash
chmod u+x backup.sh
./backup.sh "$HOME/Documents" "$HOME/backups"
```

In `tar -czf`, `-c` creates an archive, `-z` compresses it with gzip, and `-f` specifies its filename. `-C` changes directory before collecting files; `.` includes that directory's contents, including hidden entries.

Inspect and practice restoring an archive using its actual filename:

```bash
tar -tzf /path/to/backup.tar.gz

mkdir -p "$HOME/restore-test"
tar -xzf /path/to/backup.tar.gz -C "$HOME/restore-test"
```

Extract trusted archives into a separate test directory. A successful archive command is only part of a backup strategy: check restores and consider files changing while the backup runs.

# Scheduling and background execution

On a system with cron, edit your user schedule using `crontab -e`. This example runs daily at 02:00 in cron's configured timezone:

```cron
0 2 * * * /bin/bash /home/alex/scripts/report.sh >> /home/alex/logs/report.log 2>&1
```

Replace the example paths and create the log directory first. The schedule fields are:

```text
minute hour day-of-month month day-of-week command
```

Scheduled jobs have a more limited environment than interactive shells. Use explicit paths, supply required environment settings, and record output. Systems with systemd can also schedule scripts with systemd timers.

For background execution:

```bash
bash long-task.sh > task.log 2>&1 &
pid=$!
printf 'Started process %s\n' "$pid"

if wait "$pid"; then
    printf 'Task completed.\n'
else
    printf 'Task failed.\n' >&2
fi
```

`&` starts a command in the background. `wait` waits for its completion and reports its status. Backgrounding alone does not guarantee a job survives logout; use an appropriate service manager or session tool for durable work.

# Debugging and common errors

Check syntax without executing commands:

```bash
bash -n script.sh
```

Trace execution:

```bash
bash -x script.sh
```

Tracing can expose credentials and other sensitive values. When installed, ShellCheck can identify many common issues:

```bash
shellcheck script.sh
```

| Symptom | What to check |
| --- | --- |
| Permission denied | Execute permission and filesystem restrictions |
| Command not found | Spelling, installed dependencies, and PATH |
| Bad interpreter or a visible carriage return | Shebang and Windows CRLF line endings |
| Paths with spaces fail | Missing quotes around expansions |
| Script fails under sh | Bash-specific syntax needs Bash |
| Unexpected end of file | Missing quotes, fi, done, or esac |
| Wrong files or missing files | Relative paths and working directory |
| Loop variable changes disappear | Pipeline components commonly run in subshells |

For example, variables changed inside a piped loop may not survive outside it. Prefer input redirection when accumulating results:

```bash
count=0

while IFS= read -r line || [[ -n "$line" ]]; do
    count=$((count + 1))
done < names.txt

printf 'Lines: %s\n' "$count"
```

# Reliable scripting habits

- Quote paths and ordinary variable expansions.

- Validate arguments before acting on them.

- Check important command results and required dependencies.

- Use `--` where supported to separate options from filenames.

- Use arrays for lists of arguments and `"$@"` for forwarding them.

- Use `mktemp` and cleanup traps for temporary work.

- Send error messages to standard error with `>&2`.

- Avoid parsing `ls` output or constructing commands with `eval`.

- Use ordinary user permissions unless elevated access is necessary.

- Test in a practice directory before modifying important files.

- Preview destructive operations and verify the intended paths.

- Explain assumptions and intent in comments.

For filenames that may contain spaces or newlines, use null-delimited processing:

```bash
while IFS= read -r -d '' file; do
    printf 'Found: %s\n' "$file"
done < <(find ./documents -type f -name '*.txt' -print0)
```

`-print0` separates filenames using a null byte. `< <(...)` combines input redirection with Bash process substitution. Create or replace the example `./documents` path before running it.

# Further topics and practice

| Topic | Why learn it |
| --- | --- |
| Expansion order | Understand how command text becomes arguments |
| Globbing and regular expressions | Match filenames and text correctly |
| getopts | Support options such as -v and -o filename |
| Associative arrays | Store key-value mappings |
| Signals and traps | Handle interruptions and cleanup |
| Subshells | Understand process boundaries and variable scope |
| File descriptors | Control advanced input and output |
| flock | Prevent overlapping runs where the utility is available |
| Retries and timeouts | Handle temporary failure without hanging forever |
| Idempotency | Make repeated runs produce a stable result |
| POSIX shell syntax | Support a wider range of shells |
| Integration tests | Verify behavior with realistic inputs and failures |

Practice in this order:

1. Print a greeting and the current date.

2. Accept a name as an argument.

3. Check whether a file exists.

4. Count lines in a file.

5. Search logs for a supplied word.

6. Process every text file in a directory.

7. Generate a system report.

8. Create, inspect, and restore a backup.

9. Add logging and error handling.

10. Schedule a script after verifying it manually.

Keep the [GNU Bash Reference Manual](https://www.gnu.org/s/bash/manual/html_node/index.html) available while learning. On Linux, `help read`, `help printf`, `help test`, and `man bash` explain builtins and shell behavior; `man tar`, for example, documents an external utility.

# Worked examples from your Docker practice session

Your command history covers entering a Linux container, installing tools, navigating directories, editing scripts, permissions, variables, arguments, interactive input, and exit statuses. The examples below turn that sequence into a repeatable lab.

The first part of this lab provides improved practice versions using your filenames. The section called Your original scripts explained preserves the script contents you supplied and explains their behavior separately. Your supplied prompts place those originals in `/`; the new lab consistently uses `/root/shell-practice`. Run the host commands on your Mac and the container commands inside the Linux container. Do not type the prompt or history line numbers.

## Example 1 Enter the Linux container

On your Mac:

```bash
docker ps
docker exec -it 1dcd4d8f781 bash
```

Use the ID above only if it still identifies your running container; otherwise copy its current ID or name from `docker ps`. `docker exec` starts a new command inside an existing running container. `-i` keeps input open and `-t` allocates a terminal, making this suitable for an interactive Bash session. Bash must be installed in that container. See the [Docker exec reference](https://docs.docker.com/reference/cli/docker/container/exec/).

Your prompts show the change in context:

```text
(base) roshanxavier@ACA2174LT200899 ~ %
root@1dcd4d8f7816:/#
```

The first is your Mac shell prompt; `(base)` commonly identifies an active Conda base environment. The second identifies a session presented as root in the container, currently at `/`. Confirm identity and location with commands rather than relying only on prompt text:

```bash
whoami
id -u
pwd
cat /etc/os-release
```

For the root session shown, the first three should print `root`, `0`, and `/` respectively if the working directory is unchanged. The OS release file identifies the container's Linux distribution. The Mac account and container account are separate.

`exit` leaves this Bash session and returns you to the Mac shell. Leaving an exec session does not itself stop the container's main process.

## Example 2 Install tools and choose a practice directory

Inside a Debian or Ubuntu container, as root:

```bash
apt update
apt install nano curl

mkdir -p /root/shell-practice
cd /root/shell-practice
pwd
```

Expected final output:

```text
/root/shell-practice
```

`apt update` refreshes package information; it does not upgrade every installed package. `apt install nano curl` installs an editor and a tool for making network requests. APT may prompt for confirmation and requires access to configured package repositories. These commands apply to APT-based distributions, not every Linux image.

Your root session does not need `sudo`. Minimal containers often do not include it. A non-root account would need an appropriate authorized way to obtain installation privileges. For automation, prefer `apt-get` over the interactive `apt` interface, as explained in the [Debian APT manual](https://manpages.debian.org/bookworm/apt/apt.8.en.html).

Keep your practice files under `/root/shell-practice` in this root container instead of creating them in `/usr` or `/usr/bin`, which hold system files and programs.

## Example 3 Understand paths and the env program

Inside the container:

```bash
pwd
ls -la
ls -l /usr/bin/env
command -v bash
/usr/bin/env bash -c 'printf "Bash was found and started.\n"'
```

The final command should print:

```text
Bash was found and started.
```

`/usr/bin/env` is a program, not a directory, so `cd /usr/bin/env` fails. `cat /usr/bin/env` prints executable bytes rather than useful documentation and may disturb terminal display. Run `env --help` for help, or `env` to list exported environment values. Environment listings may include secrets, so inspect them before sharing.

This explains the shebang used by your scripts:

```bash
#!/usr/bin/env bash
```

For direct script execution, the operating system starts `/usr/bin/env`, which locates Bash through `PATH`. You do not need to change into `/usr/bin` to use it.

`cat etc/os-release` is a relative path: it happens to refer to `/etc/os-release` when you are in `/`, but usually fails from your practice directory. `cat /etc/os-release` works regardless of your current directory.

The repeated `1;2c` text in your history is not a shell scripting command. It may be terminal control or response text, but the history alone does not establish its cause. If the display becomes garbled, try `reset` if installed, or exit and open a fresh terminal session.

## Example 4 Create hello sh and run it correctly

Inside the container:

```bash
cd /root/shell-practice
nano hello.sh
```

Save this script content:

```bash
#!/usr/bin/env bash

printf 'Hello, %s. Today is %s.\n' "${USER:-$(whoami)}" "$(date +%A)"
printf 'Actual account: %s\n' "$(whoami)"
count=5
printf 'Count: %s\n' "$count"
```

Save with Ctrl+O and Enter, then exit Nano with Ctrl+X. Inspect it, grant execute permission, and run it:

```bash
cat hello.sh
chmod u+x hello.sh
./hello.sh
```

Illustrative output, assuming `USER=root` and the container reports Thursday:

```text
Hello, root. Today is Thursday.
Actual account: root
Count: 5
```

The weekday depends on the container's date, timezone, and locale. `${USER:-$(whoami)}` uses `USER` if it is nonempty, otherwise the account reported by `whoami`.

Your original one-line command also works directly in Bash:

```bash
echo "Hello, $USER. Today is $(date +%A)."
```

The script adds a fallback because minimal container environments can leave `USER` unset. `printf` gives more predictable formatting across values and shells than relying on all of `echo`'s option and escape behavior.

| Invocation | What happens |
| --- | --- |
| `./hello.sh` | Runs this file in the current directory; requires execute permission |
| `bash hello.sh` | Bash reads the file; execute permission is not required, but read access is |
| `hello.sh` | Searches PATH; normally does not search the current directory |
| `./hello` | Looks for a file literally named hello; does not add .sh |
| `cat hello.sh` | Displays the script without executing it |

You do not need to repeat `chmod` after every ordinary edit to the same file. If an editor replaces the file or its permissions change, check again with `ls -l hello.sh`.

## Example 5 Compare variables and exported environment values

Your commands `$USER = roshan` and `count = 5` use the wrong assignment syntax. Assign using the variable name, no leading dollar sign, and no spaces around `=`:

```bash
display_name="Roshan"
count=5
printf '%s has a count of %s.\n' "$display_name" "$count"
```

Expected output:

```text
Roshan has a count of 5.
```

To make variable inheritance clear, create `environment.sh` with a custom variable name instead of changing the conventional `USER` variable:

```bash
#!/usr/bin/env bash

printf 'display_name=%s\n' "${display_name:-not available}"
printf 'Actual account=%s\n' "$(whoami)"
```

Run this sequence inside your root container session:

```bash
chmod u+x environment.sh

unset display_name
display_name="Roshan"
./environment.sh

display_name="Roshan" ./environment.sh

export display_name="Roshan"
./environment.sh

unset display_name
```

Expected script output in order:

```text
display_name=not available
Actual account=root
display_name=Roshan
Actual account=root
display_name=Roshan
Actual account=root
```

The first assignment creates a shell variable without exporting it. The assignment before a command supplies a value to that command's environment. `export` makes it available to subsequent child processes. `unset` removes it.

Your `USER="Roshan" ./hello.sh` similarly supplies a value to that script invocation. `export USER="Roshan"` makes subsequent child scripts inherit it. Neither changes your Linux account, user ID, or privileges: `whoami` still reports root in this session.

There is an important subtlety in `USER=roshan`: if `USER` was already exported, assigning a new value keeps its export attribute and child scripts can see the change even without a new `export` command. If it was not exported, the assignment alone does not export it. This is why a fresh custom variable makes the demonstration easier to understand. See [Bash environment behavior](https://www.gnu.org/software/bash/manual/html_node/Environment.html).

Changes inside an exec shell are not a permanent change to the container configuration. A later, separate `docker exec` session does not inherit variables you exported in this session. To explicitly supply a value from the Mac for a new exec process:

```bash
docker exec -it -e display_name=Roshan 1dcd4d8f781 bash
```

## Example 6 Pass arguments to arguments sh

Inside `/root/shell-practice`, open `nano arguments.sh` and save:

```bash
#!/usr/bin/env bash

if (( $# != 2 )); then
    printf 'Usage: %s NAME CITY\n' "$0" >&2
    exit 2
fi

name=$1
city=$2

printf 'Name: %s\n' "$name"
printf 'City: %s\n' "$city"
printf 'Argument count: %s\n' "$#"
```

Run:

```bash
chmod u+x arguments.sh
./arguments.sh roshan vancouver
```

Expected output:

```text
Name: roshan
City: vancouver
Argument count: 2
```

Try a name and city containing spaces:

```bash
./arguments.sh "Roshan Xavier" "North Vancouver"
```

The quotes preserve two arguments. `$1` is the name, `$2` is the city, and `$#` counts the arguments. Missing or extra arguments print a usage message and return status 2.

`touch arguments.sh` is optional before using Nano: Nano can create the file when you save. `cat arguments` looks for a different filename from `cat arguments.sh`. In the root session shown, `sudo chmod` is unnecessary; use `chmod u+x arguments.sh`.

## Example 7 Read interactive answers with read sh

Open `nano read.sh` and save:

```bash
#!/usr/bin/env bash

if ! read -r -p "Enter your name: " name; then
    printf '\nCould not read a name.\n' >&2
    exit 1
fi

if ! read -r -p "Enter your city: " city; then
    printf '\nCould not read a city.\n' >&2
    exit 1
fi

if [[ -z "$name" || -z "$city" ]]; then
    printf 'Name and city must not be empty.\n' >&2
    exit 2
fi

printf 'Hello, %s from %s!\n' "$name" "$city"
```

Run:

```bash
chmod u+x read.sh
./read.sh
```

Example interaction, with your responses typed after each prompt:

```text
Enter your name: Roshan
Enter your city: Vancouver
Hello, Roshan from Vancouver!
```

Unlike command-line arguments, `read` receives values after the script starts. `-r` preserves backslashes. This script rejects empty strings; it does not trim or reject answers consisting only of spaces. Ctrl+D can signal end of input, which the script handles as a read failure.

## Example 8 Observe exit statuses with exitcodes sh

Open `nano exitcodes.sh` and save:

```bash
#!/usr/bin/env bash

if (( $# != 1 )); then
    printf 'Usage: %s FILE\n' "$0" >&2
    exit 2
fi

if [[ -f "$1" ]]; then
    printf 'Found regular file: %s\n' "$1"
    exit 0
else
    printf 'Regular file not found: %s\n' "$1" >&2
    exit 1
fi
```

Run these commands in the practice directory, where `hello.sh` now exists:

```bash
chmod u+x exitcodes.sh

./exitcodes.sh hello.sh
printf 'Exit status: %s\n' "$?"

./exitcodes.sh /dev/null/not-a-file
printf 'Exit status: %s\n' "$?"

./exitcodes.sh
printf 'Exit status: %s\n' "$?"
```

Expected output:

```text
Found regular file: hello.sh
Exit status: 0
Regular file not found: /dev/null/not-a-file
Exit status: 1
Usage: ./exitcodes.sh FILE
Exit status: 2
```

The impossible child path under `/dev/null` supplies a predictable missing-file case on Linux. Status 0 conventionally means success; this script chooses 1 for a missing regular file and 2 for incorrect usage. Other programs may assign different meanings to nonzero codes.

Read `$?` immediately. Running another command first changes it. A direct test is often clearer:

```bash
if ./exitcodes.sh hello.sh; then
    printf 'Continue processing the file.\n'
else
    printf 'Handle the unsuccessful result.\n' >&2
fi
```

## Corrections to commands in your history

| History entry | Correction or explanation |
| --- | --- |
| `sudo apt` | No requested operation; use apt update or apt install PACKAGE as appropriate, without sudo in this root session |
| `sudo insall apt` | Misspelled command and wrong installation order; use apt install nano curl for these tools |
| `apt updat` | Use apt update |
| `cat etc/os-release` | Use cat /etc/os-release for a location-independent path |
| `cd env` from /usr/bin | env is a program, not a directory |
| `cat env` from /usr/bin | Prints executable bytes; use env --help for help |
| Repeated `1;2c` text | Not a useful shell command; possible terminal response text |
| `hello.sh` | Use ./hello.sh when the file is in the current directory |
| `./hello` | Use the exact filename ./hello.sh |
| `$USER = roshan` | Assign USER=roshan, or preferably use a custom variable such as display_name |
| `count = 5` | Assign count=5 |
| `cat arguments` | Use cat arguments.sh if that is the file you created |
| Running a new script before chmod | Run chmod u+x SCRIPT first, or use bash SCRIPT |
| `sudo chmod +x arguments.sh` | In this root session, chmod u+x arguments.sh is sufficient |

The `history` command shows commands from the interactive Bash session; it does not show whether each succeeded or what a script contained at the time. Use `cat`, captured output, and immediate exit-status checks to understand those results.

## Keep your practice files outside the container

Files created in a container's writable layer remain with that container across ordinary stops and starts, but are lost when the container is removed unless stored elsewhere. Before removing your practice container, copy the scripts to your Mac.

Inside the container, after creating the examples:

```bash
cd /root/shell-practice
ls -l hello.sh environment.sh arguments.sh read.sh exitcodes.sh
exit
```

Then on your Mac:

```bash
mkdir -p "$HOME/shell-practice-backup"
docker cp 1dcd4d8f781:/root/shell-practice/. "$HOME/shell-practice-backup/"
```

Use the correct container ID if it has changed. If your earlier scripts are elsewhere, locate them before copying; these examples use `/root/shell-practice` consistently. For ongoing work, a bind mount or volume can provide persistent storage.

## Your original scripts explained

These are the scripts you shared, followed by explanations and optional improvements. Your `cat` output was captured at the container root prompt, so the supplied examples refer to `/hello.sh`, `/arguments.sh`, `/read.sh`, and `/exitcodes.sh`. Their behavior is distinct from the more defensive lab versions above. Save changes to the practice copies if you want to keep the originals for comparison.

### Your hello sh script

```bash
#! /usr/bin/env bash
# my first program
echo "hello  $USER, Today is $(date +%A)"
count=5
echo $((count+2))
greetings="Happy Birthday"
echo "$greetings"
echo "${greetings} roshan"
```

| Line | Explanation |
| --- | --- |
| `#! /usr/bin/env bash` | Selects Bash for direct execution on Linux; the space after the shebang marker is accepted here |
| `# my first program` | A comment documenting the program |
| Greeting with `$USER` and `$(date +%A)` | Expands USER and substitutes the full weekday name produced by date |
| `count=5` | Assigns the value 5 without spaces around the equals sign |
| `echo $((count+2))` | Evaluates integer arithmetic and prints 7; count itself remains 5 |
| `greetings="Happy Birthday"` | Stores a string containing a space |
| `echo "$greetings"` | Prints the stored greeting |
| `echo "${greetings} roshan"` | Expands the variable and appends a space and roshan |

Illustrative output if USER is root and the container reports Thursday:

```text
hello  root, Today is Thursday
7
Happy Birthday
Happy Birthday roshan
```

The supplied greeting includes unusual whitespace after `hello`, which can affect its exact appearance. The weekday depends on the container's date, timezone, and locale. If USER is unset, that position is empty; if you previously exported USER as Roshan, it can display Roshan while `whoami` still reports root.

Braces make variable boundaries explicit. In this line the following space already ends the name, so `$greetings roshan` and `${greetings} roshan` produce the same result. Braces become necessary when adjoining characters could extend the variable name:

```bash
printf '%s\n' "${greetings}_roshan"
```

Without braces, `$greetings_roshan` refers to a different variable. For consistent formatting, an optional revised greeting is:

```bash
printf 'hello %s, Today is %s\n' "${USER:-$(whoami)}" "$(date +%A)"
```

### Your arguments sh script

```bash
#! /usr/bin/env bash
echo "Script name: $0"
echo "Name: $1"
echo "Location: $2"
echo "Arg count: $#"
echo "All Args: $@"
```

From the directory containing the file, run:

```bash
./arguments.sh roshan vancouver
```

Expected output:

```text
Script name: ./arguments.sh
Name: roshan
Location: vancouver
Arg count: 2
All Args: roshan vancouver
```

`$0` depends on how the script was invoked; invoking `/arguments.sh` displays that path instead. `$1` and `$2` are argument values, while `$#` counts all supplied arguments. This original does not validate the count: with no arguments under ordinary Bash settings, the Name and Location values are empty and the count is 0.

`"$@"` preserves arguments as separate shell words, even when it appears with other text inside double quotes. `echo` then displays its arguments with spaces, so the final line does not reveal where one argument ended and another began. For example, two arguments containing spaces can look like four words in the output.

To see each argument boundary clearly, add this optional loop:

```bash
index=1
for argument in "$@"; do
    printf 'Argument %s: <%s>\n' "$index" "$argument"
    index=$((index + 1))
done
```

Test with:

```bash
./arguments.sh "Roshan Xavier" "North Vancouver"
```

The loop prints:

```text
Argument 1: <Roshan Xavier>
Argument 2: <North Vancouver>
```

The validated version earlier in this lab checks for exactly two arguments before using them.

### Your read sh script

```bash
#! /usr/bin/env bash
read -p "Enter you name: " name
echo "$name"
```

Example interaction:

```text
Enter you name: Roshan
Roshan
```

`read -p` displays the prompt and stores input in the variable `name`. `echo "$name"` prints it with spaces preserved in the expansion. The phrase `Enter you name` is just the prompt text; change it to `Enter your name` to correct the wording.

Without `-r`, backslashes have special meaning during input. Also, ordinary read processing can trim leading and trailing characters from IFS, which defaults to spaces, tabs, and newlines. To preserve literal backslashes and leading or trailing spaces, use:

```bash
#!/usr/bin/env bash

if IFS= read -r -p "Enter your name: " name; then
    printf '%s\n' "$name"
else
    printf '\nNo complete input line was received.\n' >&2
    exit 1
fi
```

This improvement also checks whether reading succeeded. In the original, a failed read can be followed by a successful echo, masking the read failure in the script's final status. The `-p` option is a Bash feature; retain Bash as the interpreter for this example.

### Your exitcodes sh script

```sh
#! /usr/bin/env sh
ls /tmp; echo $?
ls /nope; echo $?
```

This script selects `sh`, and its commands use portable shell syntax. It does not require Bash-specific arrays, double-bracket tests, or arithmetic commands. The space after `#!` is accepted on Linux; `#!/usr/bin/env sh` is the conventional spelling.

Each semicolon separates two commands on one line. `echo $?` expands the status of the preceding `ls` before echo runs. The semicolon means the second command runs regardless of whether the first succeeded.

On a GNU/Linux container where `/tmp` is readable and `/nope` does not exist, a typical result is:

```text
<listing of the contents of /tmp, possibly empty>
0
ls: cannot access '/nope': No such file or directory
2
```

The first line is an explanatory placeholder, not literal output. Error wording depends on the implementation and locale. GNU ls normally returns 2 for this missing-directory error; other implementations can return another nonzero value. If `/nope` exists, this is no longer a failure example.

Now check the status of the script itself:

```bash
./exitcodes.sh
printf 'Script exit status: %s\n' "$?"
```

Normally, the final line is:

```text
Script exit status: 0
```

**Printing a failure status is different from returning a failure status.** Without an explicit exit, the script returns the status of its last executed command. Here that command is the final echo, which normally succeeds, even though the preceding ls failed.

To preserve and return the second ls status while still printing it:

```sh
#!/usr/bin/env sh

ls /tmp
status=$?
printf 'First ls status: %s\n' "$status"

ls /nope
status=$?
printf 'Second ls status: %s\n' "$status"

exit "$status"
```

This version deliberately returns the second ls result; it does not combine both operations into one overall success decision. Assigning `status=$?` immediately captures the result before printing another message overwrites it. The earlier file-checking lab example instead chooses explicit application statuses 0, 1, and 2.

## Practice checkpoints

- [ ] Explain which prompt belongs to the Mac and which belongs to the container.

- [ ] Confirm the container's account, current directory, and distribution.

- [ ] Create hello.sh, inspect it, and run it using both invocation methods.

- [ ] Explain why USER can differ from the account reported by whoami.

- [ ] Compare an ordinary shell variable, a per-command value, and an exported variable.

- [ ] Run arguments.sh with two arguments and then with missing arguments.

- [ ] Run read.sh with ordinary input, empty input, and end of input.

- [ ] Observe statuses 0, 1, and 2 from exitcodes.sh.

- [ ] Copy the practice directory to the Mac before removing the container.
