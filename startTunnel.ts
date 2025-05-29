import { join } from "@std/path";

export interface StartTunnelOptions {
  tunnelName: string;
}

export async function startTunnel({
  tunnelName,
}: StartTunnelOptions): Promise<Deno.ChildProcess> {
  const cloudflaredPath = "cloudflared"; // Assumes it's available in PATH
  const homeDir = Deno.env.get("HOME");

  if (!homeDir) {
    throw new Error("HOME environment variable is not set.");
  }

  const configDir = join(homeDir, ".cloudflared");
  const credentialsFile = join(configDir, `config.yml`);

  try {
    await Deno.stat(credentialsFile);
  } catch {
    throw new Error(
      `Tunnel configuration not found at ${credentialsFile}. Run: cloudflared tunnel create ${tunnelName}`
    );
  }

  const process = new Deno.Command(cloudflaredPath, {
    args: ["tunnel", "run", tunnelName],
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const logStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    prefix: string
  ) => {
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) console.log(`${prefix} ${decoder.decode(value)}`);
    }
  };

  logStream(process.stdout.getReader(), "[cloudflared]");
  logStream(process.stderr.getReader(), "[cloudflared ERROR]");

  return process;
}
