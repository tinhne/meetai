import { describe, expect, it } from "vitest";

import { createConfirmStore } from "./confirm-store";

const initial = { open: false, title: "End?", description: "Everyone leaves." };

describe("createConfirmStore", () => {
  it("opens on ask and resolves with the user's choice", async () => {
    const store = createConfirmStore(initial);
    const answer = store.ask();
    expect(store.get().open).toBe(true);
    store.settle(true);
    await expect(answer).resolves.toBe(true);
    expect(store.get().open).toBe(false);
  });

  it("resolves an earlier pending ask as cancelled", async () => {
    const store = createConfirmStore(initial);
    const first = store.ask();
    const second = store.ask();
    store.settle(true);
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
  });

  it("keeps the same state object when nothing changes", () => {
    const store = createConfirmStore(initial);
    const before = store.get();
    store.settle(false);
    expect(store.get()).toBe(before);
  });
});
