/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const fse = require('fs-extra');
const request = require('request-promise-native');
const UpCommand = require('@adobe/helix-cli/src/up.cmd');

async function createTestRoot() {
  const dir = path.resolve(__dirname, 'tmp', crypto.randomBytes(16).toString('hex'));
  await fse.ensureDir(dir);
  return dir;
}

async function eventPromise(emitter, name) {
  return new Promise((resolve) => {
    emitter.on(name, resolve);
  });
}

describe('HTML Indexing', () => {
  let testRoot;

  before(async () => {
    testRoot = await createTestRoot();
  });

  after(async () => {
    await fse.remove(testRoot);
  });

  it('Run html_json', async () => {
    const up = new UpCommand()
      .withFiles(['src/*.js'])
      .withLocalRepo(['.'])
      .withHttpPort(0)
      .withTargetDir(testRoot);

    const started = eventPromise(up, 'started');
    const stopped = eventPromise(up, 'stopped');
    try {
      await up.run();
      await started;

      const expected = await fse.readJson(path.resolve(__dirname, 'specs', 'blog', 'post_html.json'));
      const json = await request.get(`http://localhost:${up.project.server.port}/test/specs/blog/post.html.json`, {
        json: true,
      });
      assert.deepEqual(json, expected);

      const expected1 = await fse.readJson(path.resolve(__dirname, 'specs', 'blog', 'post1_html.json'));
      const json1 = await request.get(`http://localhost:${up.project.server.port}/test/specs/blog/post1.html.json`, {
        json: true,
      });
      assert.deepEqual(json1, expected1);
    } finally {
      await up.stop();
      await stopped;
    }
  }).timeout(5000);
});
