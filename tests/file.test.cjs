const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { resolveFileUrl } = require('../src/utils/attachment.ts');

test('相对路径保留部署目录，根路径、完整地址和查询参数按 URL 语义解析', () => {
  const base = 'https://zentao.example/zentao';
  for (const suffix of ['', '/']) {
    assert.equal(resolveFileUrl('file-read-12.png', base + suffix), base + '/file-read-12.png');
    assert.equal(resolveFileUrl('./file-download-13.html?mode=download#file', base + suffix), base + '/file-download-13.html?mode=download#file');
    assert.equal(resolveFileUrl('/zentao/file-read-12.png', base + suffix), base + '/file-read-12.png');
    assert.equal(resolveFileUrl('/file-read-12.png', base + suffix), 'https://zentao.example/file-read-12.png');
  }
  assert.equal(resolveFileUrl('../image.png', base), 'https://zentao.example/image.png');
  assert.equal(resolveFileUrl('//cdn.example/image.png', base), 'https://cdn.example/image.png');
  assert.equal(resolveFileUrl('https://cdn.example/a.png?q=1', ''), 'https://cdn.example/a.png?q=1');
  assert.equal(resolveFileUrl('文件 1.pdf', base), base + '/%E6%96%87%E4%BB%B6%201.pdf');
  assert.equal(resolveFileUrl('a.png', base + '?mode=1#top'), base + '/a.png');
});

test('拒绝空路径、无效配置、非网络协议及带凭据的地址', () => {
  assert.throws(() => resolveFileUrl(' ', ''), /不能为空/);
  assert.throws(() => resolveFileUrl('a.png', ''), /server.url/);
  for (const value of ['file:///a.png', 'data:image/png;base64,aaa', 'javascript:alert(1)']) {
    assert.throws(() => resolveFileUrl(value, ''), /HTTP/);
  }
  assert.throws(() => resolveFileUrl('https://user:secret@example.com/a.png', ''), /用户名或密码/);
  assert.throws(() => resolveFileUrl('http://', 'https://zentao.example'), /路径无效/);
});

function run(...args) {
  const env = { ...process.env, ZENTAO_URL: 'https://zentao.example/zentao' };
  delete env.DOTENV_CONFIG_QUIET;
  return spawnSync(process.execPath, ['--require', 'tsx/cjs', 'src/index.ts', ...args], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
    env,
  });
}

test('命令提供纯文本或纯 JSON，支持全局选项放在命令前后', () => {
  const text = run('get-url', '/file-read-12.png');
  assert.equal(text.status, 0, text.stderr);
  assert.equal(text.stdout.trim(), 'https://zentao.example/file-read-12.png');
  for (const args of [['--json', 'get-url', 'file-read-12.png'], ['get-url', 'file-read-12.png', '--json']]) {
    const result = run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { url: 'https://zentao.example/zentao/file-read-12.png' });
  }
});

test('命令输入错误时失败且不输出伪 JSON', () => {
  const result = run('--json', 'get-url', 'data:text/plain,test');
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /仅支持 HTTP/);
});
