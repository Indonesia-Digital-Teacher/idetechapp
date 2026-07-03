import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { waitForDatabase } from "./init";
import * as clientModule from "./client";

describe("waitForDatabase", () => {
  const originalGetConnection = clientModule.pool.getConnection.bind(clientModule.pool);

  function restorePool() {
    clientModule.pool.getConnection = originalGetConnection;
    mock.restore();
  }

  beforeEach(() => {
    restorePool();
  });

  afterEach(() => {
    restorePool();
  });

  test("Berhasil langsung jika koneksi pertama sukses", async () => {
    let calls = 0;
    clientModule.pool.getConnection = mock(() => {
      calls++;
      return Promise.resolve({ release: () => {} } as unknown as ReturnType<typeof originalGetConnection>);
    });

    await waitForDatabase({ maxRetries: 3, initialDelayMs: 10 });
    expect(calls).toBe(1);
  });

  test("Retry dan berhasil setelah beberapa kegagalan", async () => {
    let calls = 0;
    clientModule.pool.getConnection = mock(() => {
      calls++;
      if (calls < 3) {
        return Promise.reject(new Error("Connection refused"));
      }
      return Promise.resolve({ release: () => {} } as unknown as ReturnType<typeof originalGetConnection>);
    });

    await waitForDatabase({ maxRetries: 5, initialDelayMs: 10 });
    expect(calls).toBe(3);
  });

  test("Gagal jika semua retry habis", async () => {
    clientModule.pool.getConnection = mock(() =>
      Promise.reject(new Error("Connection refused"))
    );

    await expect(
      waitForDatabase({ maxRetries: 3, initialDelayMs: 10 })
    ).rejects.toThrow("Connection refused");
  });
});
