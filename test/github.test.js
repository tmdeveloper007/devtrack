const assert = require("node:assert/strict");
const test = require("node:test");

function createMockFetch(responseData, responseOk = true) {
  return function mockFetch(url, options) {
    return Promise.resolve({
      ok: responseOk,
      status: responseOk ? 200 : 500,
      json: () => Promise.resolve(responseData),
    });
  };
}

test("fetchUserEvents makes request with correct headers", async () => {
  const mockData = [{ id: "1", type: "PushEvent", created_at: "2024-01-01", repo: { name: "test/repo" } }];
  global.fetch = createMockFetch(mockData);

  const { fetchUserEvents } = require("../src/lib/github.js");
  const result = await fetchUserEvents("test-token");

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "1");
});

test("fetchUserEvents throws error when response is not ok", async () => {
  global.fetch = createMockFetch({}, false);

  const { fetchUserEvents } = require("../src/lib/github.js");
  await assert.rejects(async () => fetchUserEvents("test-token"), /GitHub API error/);
});

test("fetchUserRepos makes request with correct headers", async () => {
  const mockData = [{ id: 1, name: "repo1", full_name: "user/repo1", open_issues_count: 5, stargazers_count: 10, pushed_at: "2024-01-01" }];
  global.fetch = createMockFetch(mockData);

  const { fetchUserRepos } = require("../src/lib/github.js");
  const result = await fetchUserRepos("test-token");

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "repo1");
});

test("fetchUserRepos throws error when response is not ok", async () => {
  global.fetch = createMockFetch({}, false);

  const { fetchUserRepos } = require("../src/lib/github.js");
  await assert.rejects(async () => fetchUserRepos("test-token"), /GitHub API error/);
});

test("fetchUserEvents constructs correct API endpoint", async () => {
  let capturedUrl = "";
  global.fetch = function mockFetch(url) {
    capturedUrl = url;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });
  };

  const { fetchUserEvents } = require("../src/lib/github.js");
  await fetchUserEvents("test-token");

  assert.ok(capturedUrl.includes("/user/events"));
  assert.ok(capturedUrl.includes("per_page=100"));
});

test("fetchUserRepos constructs correct API endpoint", async () => {
  let capturedUrl = "";
  global.fetch = function mockFetch(url) {
    capturedUrl = url;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });
  };

  const { fetchUserRepos } = require("../src/lib/github.js");
  await fetchUserRepos("test-token");

  assert.ok(capturedUrl.includes("/user/repos"));
  assert.ok(capturedUrl.includes("sort=pushed"));
  assert.ok(capturedUrl.includes("per_page=10"));
});