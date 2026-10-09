const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const assert = require('assert');
const tasks = require('../main/tasks.cjs');

(async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'fileup-test-'));
  const log = (...a) => console.log(' ', ...a);

  try {
   
    await fsp.mkdir(path.join(root, 'sub', 'deep'), { recursive: true });
    await fsp.writeFile(path.join(root, 'a.txt'), 'hello world');
    await fsp.writeFile(path.join(root, 'b.txt'), 'hello world');          
    await fsp.writeFile(path.join(root, 'c.log'), 'unique content here');
    await fsp.writeFile(path.join(root, '.hidden'), 'secret');
    await fsp.writeFile(path.join(root, 'sub', 'd.txt'), 'hello world'); 
    await fsp.writeFile(path.join(root, 'sub', 'deep', 'e.md'), '# deep');
    log('fixtures created at', root);

    
    {
      const res = await tasks.deepSearch(root, '*.txt', {}, null, () => { });
      assert.strictEqual(res.length, 3, `expected 3 txt files, got ${res.length}`);
      log('deepSearch *.txt →', res.length, 'results ✓');

      const res2 = await tasks.deepSearch(root, 'deep', { showHidden: false }, null, () => { });
      assert.ok(res2.some(r => r.name === 'deep' && r.isDir), 'should find folder "deep"');
      assert.ok(!res2.some(r => r.name === 'e.md'), 'files without "deep" in name should not match');
      log('deepSearch "deep" → folder match, name-only matching ✓');

      const res3 = await tasks.deepSearch(root, 'unique content', {}, null, () => { });
      assert.strictEqual(res3.length, 0, 'name search should not match content');
      log('deepSearch does not match file content ✓');
    }

    
    {
      const res = await tasks.findDuplicates(root, { minSize: 1 }, null, () => { });
      assert.strictEqual(res.groups.length, 1, 'expected 1 dup group');
      assert.strictEqual(res.groups[0].files.length, 3, 'group should have 3 identical files');
      assert.strictEqual(res.scanned >= 6, true, 'scanned all entries');
      log('findDuplicates → 1 group, 3 files ✓');
    }

   
    {
      const md5 = await tasks.hashFileSync(path.join(root, 'a.txt'), 'md5');
      assert.strictEqual(md5, '5eb63bbbe01eeed093cb22bb8f5acdc3', 'md5 of "hello world"');
      const sha = await tasks.hashWithProgress(path.join(root, 'a.txt'), 'sha256', () => { });
      assert.ok(/^[a-f0-9]{64}$/.test(sha), 'sha256 hex');
      log('md5/sha256 hashing ✓');
    }

    
    {
      const victim = path.join(root, 'sub', 'd.txt');
      await tasks.shredPath(victim, 2, null, () => { });
      let gone = false;
      try { await fsp.stat(victim); } catch { gone = true; }
      assert.ok(gone, 'shredded file must be gone');
      log('secure shred → file destroyed ✓');

      const dirVictim = path.join(root, 'sub', 'deep');
      await tasks.shredPath(dirVictim, 1, null, () => { });
      let dirGone = false;
      try { await fsp.stat(dirVictim); } catch { dirGone = true; }
      assert.ok(dirGone, 'shredded folder must be gone');
      log('secure shred → folder destroyed ✓');
    }

    
    {
      const buildNewName = require('./build_new_name_test.cjs');
      assert.strictEqual(buildNewName('photo.jpg', 0, { mode: 'number', base: 'Pic', sep: '-', start: 5, pad: 4 }), 'Pic-0005.jpg');
      assert.strictEqual(buildNewName('IMG_1234.png', 0, { mode: 'replace', find: 'IMG', replaceWith: 'shot' }), 'shot_1234.png');
      assert.strictEqual(buildNewName('report.docx', 0, { mode: 'affix', prefix: '[old] ' }), '[old] report.docx');
      assert.strictEqual(buildNewName('MiXeD.TXT', 0, { mode: 'case', caseMode: 'lower' }), 'mixed.TXT');
      assert.strictEqual(buildNewName('MiXeD.TXT', 0, { mode: 'case', caseMode: 'upper' }), 'MIXED.TXT');
      log('batch rename patterns ✓');
    }

    console.log('\nALL MAIN-PROCESS LOGIC TESTS PASSED ✅');
  } finally {
    await fsp.rm(root, { recursive: true, force: true }).catch(() => { });
  }
})().catch(e => { console.error('TEST FAILED ❌', e); process.exit(1); });
