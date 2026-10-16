import assert from "node:assert/strict";
import test from "node:test";
import { adminMembership } from "./fleet-profile.mjs";

test("admin membership uses the check text and ignores a failed command", () => {
  assert.equal(adminMembership("yes sebastientardif is a member of admin", ""), true);
  assert.equal(adminMembership("no nobody is NOT a member of admin", ""), false);
  assert.equal(adminMembership("", ""), null);
});
