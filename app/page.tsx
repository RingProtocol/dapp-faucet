import { ChainFaucetPicker, type ChainFaucetInfo } from "@/components/ChainFaucetPicker";
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

async function readChainsYaml(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), "chains.yaml"),
    path.join(process.cwd(), "config", "chains.yaml"),
  ];

  for (const filePath of candidates) {
    try {
      await access(filePath, fsConstants.R_OK);
      return await readFile(filePath, "utf8");
    } catch {}
  }

  throw new Error("chains.yaml not found");
}

function parseChainsYamlForFaucets(yaml: string): ChainFaucetInfo[] {
  const lines = yaml.split(/\r?\n/);

  const out: ChainFaucetInfo[] = [];
  let current: Partial<ChainFaucetInfo> | null = null;
  let inFaucets = false;
  let faucetsIndent = -1;

  const pushCurrent = () => {
    if (!current) return;
    if (typeof current.chainId === "number" && typeof current.name === "string") {
      out.push({
        chainId: current.chainId,
        name: current.name,
        faucets: Array.isArray(current.faucets) ? current.faucets : [],
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();
    if (!line || line.trim() === "---") continue;

    const isNewItem = /^-\s+name:\s*(.+)$/.exec(line.trim());
    if (isNewItem) {
      pushCurrent();
      current = { name: isNewItem[1].trim(), faucets: [] };
      inFaucets = false;
      faucetsIndent = -1;
      continue;
    }

    if (!current) continue;

    const leadingSpaces = raw.length - raw.trimStart().length;

    if (inFaucets) {
      if (leadingSpaces <= faucetsIndent && line.trim()) {
        inFaucets = false;
        faucetsIndent = -1;
      } else {
        const faucetMatch = /^\s*-\s*(\S.+)$/.exec(raw);
        if (faucetMatch) {
          const url = faucetMatch[1].trim();
          if (url) (current.faucets as string[]).push(url);
        }
        continue;
      }
    }

    const chainIdMatch = /^\s*chainId:\s*(\d+)\s*$/.exec(raw);
    if (chainIdMatch) {
      current.chainId = parseInt(chainIdMatch[1], 10);
      continue;
    }

    const faucetsInlineEmpty = /^\s*faucets:\s*\[\s*\]\s*$/.exec(raw);
    if (faucetsInlineEmpty) {
      current.faucets = [];
      continue;
    }

    const faucetsStart = /^\s*faucets:\s*$/.exec(raw);
    if (faucetsStart) {
      inFaucets = true;
      faucetsIndent = leadingSpaces;
      current.faucets = [];
      continue;
    }
  }

  pushCurrent();
  return out
    .filter((c) => Array.isArray(c.faucets) && c.faucets.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default async function Home() {
  const yaml = await readChainsYaml();
  const chains = parseChainsYamlForFaucets(yaml);

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary to-primary-dark p-5">
      <div className="max-w-container mx-auto">
        <h1 className="text-white text-center text-3xl font-bold mb-2">
          Faucet Launcher
        </h1>
        <p className="text-white/80 text-center mb-8">
          在 iframe / RingWallet 中选择链并打开对应 faucet
        </p>

        <ChainFaucetPicker chains={chains} />
      </div>
    </main>
  );
}
