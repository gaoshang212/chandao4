const assert = require('node:assert/strict');
const { test } = require('node:test');
const { parseActions } = require('../src/utils/actions.ts');
const { BugService } = require('../src/services/bug.service.ts');
const { TaskService } = require('../src/services/task.service.ts');
const { formatBugDetail, formatTaskDetail, formatJson } = require('../src/utils/format.ts');

const baseUrl = 'https://zentao.example';
const comment = '<p>修复 &amp; 验证<br />第二行</p><img src="/file-read-12.png" />';
const actions = {
  20: {
    id: '20', actor: 'tester', action: 'resolved', date: '2026-10-09 12:00:00',
    comment, extra: 'fixed', history: [
      { field: 'status', old: 'active', new: 'resolved', diff: '' },
      { field: 'consumed', old: 0, new: 2, diff: '0 → 2' },
    ],
  },
  30: { actor: 'tester', action: 'opened', date: '2026-10-08 12:00:00', history: [] },
};

test('兼容对象和数组，按时间排序并保留备注、零值、差异及图片', () => {
  const result = parseActions(actions, baseUrl);
  assert.deepEqual(result.map(a => a.id), [30, 20]);
  assert.equal(result[1].comment, comment);
  assert.deepEqual(result[1].history[1], { field: 'consumed', old: '0', new: '2', diff: '0 → 2' });
  assert.equal(result[1].files[0].downloadUrl, baseUrl + '/file-read-12.png');
  assert.deepEqual(parseActions([{ ...actions[20] }], baseUrl), [result[1]]);
});

test('缺失或异常历史不影响详情，兼容按键存储的字段变更', () => {
  for (const raw of [undefined, null, '', false, [], {}]) assert.deepEqual(parseActions(raw, baseUrl), []);
  assert.deepEqual(parseActions({ bad: {}, 3: null, 4: '异常', 5: [] }, baseUrl), []);
  const [record] = parseActions([{ id: 1, history: { a: null, b: { field: 'left', old: 1, new: 0 } } }], baseUrl);
  assert.deepEqual(record.history, [{ field: 'left', old: '1', new: '0', diff: '' }]);
});

for (const [kind, Service, format] of [['bug', BugService, formatBugDetail], ['task', TaskService, formatTaskDetail]]) {
  test(`${kind} 详情集成历史，JSON 保留原文，普通输出展示变更和备注`, async () => {
    const client = {
      getBaseUrl: () => baseUrl,
      getJson: async url => {
        assert.equal(url, `/${kind}-view-123.json`);
        return { [kind]: { id: '123', title: '测试', name: '测试' }, actions };
      },
    };
    const detail = await new Service(client).getDetail(123);
    assert.equal(detail.actions.length, 2);
    assert.equal(JSON.parse(formatJson(detail)).actions[1].comment, comment);
    const text = format(detail);
    assert.match(text, /历史记录 \(2\)/);
    assert.match(text, /tester 解决 \(fixed\)/);
    assert.match(text, /备注: 修复 & 验证\n第二行/);
    assert.match(text, /status: active → resolved/);
    assert.match(text, /consumed: 0 → 2/);
    assert.match(text, /差异: 0 → 2/);
    assert.match(text, /file-read-12\.png/);
    assert.doesNotMatch(text, /<p>|<img/);
    detail.actions[1].action = 'custom-action';
    assert.match(format(detail), /custom-action/);
  });

  test(`${kind} 无历史或对象不存在时保持兼容`, async () => {
    const client = { getBaseUrl: () => baseUrl, getJson: async () => ({ [kind]: { id: '123' } }) };
    const service = new Service(client);
    const detail = await service.getDetail(123);
    assert.deepEqual(detail.actions, []);
    assert.doesNotMatch(format(detail), /历史记录/);
    client.getJson = async () => ({});
    assert.equal(await service.getDetail(123), null);
  });
}
