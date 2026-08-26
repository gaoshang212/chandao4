import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import chalk from 'chalk';
import { Command } from 'commander';

export interface InstallSkillsOptions {
  force?: boolean;
  codexHome?: string;
}

export interface InstallSkillsResult {
  destination: string;
  version: string;
  installed: string[];
  upgraded: string[];
  skipped: string[];
}

const VERSION_FILE = '.chandao4-version';

interface ParsedVersion {
  core: [number, number, number];
  prerelease: string[];
}

function parseVersion(version: string): ParsedVersion | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version.trim());
  if (!match) return null;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split('.') ?? [],
  };
}

export function compareVersions(left: string, right: string): number {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) {
    throw new Error(`无法比较版本号: ${left} / ${right}`);
  }

  for (let index = 0; index < a.core.length; index++) {
    if (a.core[index] !== b.core[index]) {
      return a.core[index] > b.core[index] ? 1 : -1;
    }
  }

  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    if (a.prerelease.length === b.prerelease.length) return 0;
    return a.prerelease.length === 0 ? 1 : -1;
  }

  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index++) {
    const aPart = a.prerelease[index];
    const bPart = b.prerelease[index];
    if (aPart === undefined) return -1;
    if (bPart === undefined) return 1;
    if (aPart === bPart) continue;

    const aNumeric = /^\d+$/.test(aPart);
    const bNumeric = /^\d+$/.test(bPart);
    if (aNumeric && bNumeric) return Number(aPart) > Number(bPart) ? 1 : -1;
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    return aPart > bPart ? 1 : -1;
  }
  return 0;
}

function resolveBundledSkillsDir(): string {
  const candidates = [
    path.resolve(__dirname, '..', 'skills'),
    path.resolve(__dirname, '..', '..', 'src', 'skills'),
  ];

  const skillsDir = candidates.find(candidate => fs.existsSync(candidate));
  if (!skillsDir) {
    throw new Error('安装包中未找到 skills 资源，请重新安装 chandao4');
  }
  return skillsDir;
}

function resolveCodexSkillsDir(codexHome?: string): string {
  const home = codexHome?.trim() || process.env.CODEX_HOME?.trim() || path.join(os.homedir(), '.codex');
  return path.resolve(home, 'skills');
}

function resolvePackageVersion(): string {
  const packagePath = path.resolve(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as { version?: unknown };
  if (typeof packageJson.version !== 'string' || !parseVersion(packageJson.version)) {
    throw new Error('package.json 中缺少有效版本号');
  }
  return packageJson.version;
}

export function installBundledSkills(options: InstallSkillsOptions = {}): InstallSkillsResult {
  const sourceRoot = resolveBundledSkillsDir();
  const destination = resolveCodexSkillsDir(options.codexHome);
  const version = resolvePackageVersion();
  const skillNames = fs.readdirSync(sourceRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^[a-z0-9-]+$/.test(entry.name))
    .filter(entry => fs.existsSync(path.join(sourceRoot, entry.name, 'SKILL.md')))
    .map(entry => entry.name);

  if (skillNames.length === 0) {
    throw new Error('安装包中没有可安装的 skill');
  }

  fs.mkdirSync(destination, { recursive: true });
  const installed: string[] = [];
  const upgraded: string[] = [];
  const skipped: string[] = [];

  for (const skillName of skillNames) {
    const source = path.join(sourceRoot, skillName);
    const target = path.join(destination, skillName);
    const versionFile = path.join(target, VERSION_FILE);
    const targetExists = fs.existsSync(target);

    if (targetExists && !options.force) {
      const installedVersion = fs.existsSync(versionFile)
        ? fs.readFileSync(versionFile, 'utf8').trim()
        : '';
      if (!parseVersion(installedVersion) || compareVersions(version, installedVersion) <= 0) {
        skipped.push(skillName);
        continue;
      }
      upgraded.push(skillName);
    } else {
      installed.push(skillName);
    }

    fs.cpSync(source, target, { recursive: true, force: true });
    fs.writeFileSync(versionFile, `${version}\n`, 'utf8');
  }

  return { destination, version, installed, upgraded, skipped };
}

export function createInstallCommand(): Command {
  const install = new Command('install')
    .description('安装 chandao4 扩展资源');

  install.command('skills')
    .description('安装内置 Codex skills')
    .option('-f, --force', '同版本重装或强制降级')
    .action((options: { force?: boolean }) => {
      try {
        const result = installBundledSkills({ force: options.force });
        for (const skillName of result.installed) {
          console.log(chalk.green(`✓ 已安装 ${skillName} (${result.version})`));
        }
        for (const skillName of result.upgraded) {
          console.log(chalk.green(`✓ 已升级 ${skillName} (${result.version})`));
        }
        for (const skillName of result.skipped) {
          console.log(chalk.yellow(`- 已跳过 ${skillName}，已安装版本相同、更高或缺少版本标记`));
        }
        console.log(chalk.gray(`安装目录: ${result.destination}`));
      } catch (error) {
        console.error(chalk.red(`安装失败: ${error instanceof Error ? error.message : String(error)}`));
        process.exitCode = 1;
      }
    });

  return install;
}
