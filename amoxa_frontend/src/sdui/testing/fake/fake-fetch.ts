export interface FakeRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface FakeReply {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  bytes?: Uint8Array;
}

export type FakeResponder = (request: FakeRequest) => FakeReply | Error;

export class FakeFetch {
  public readonly calls: FakeRequest[] = [];

  private constructor() {}

  public static install(responder: FakeResponder): FakeFetch {
    const fake = new FakeFetch();

    vi.stubGlobal('fetch', async (input: string, init?: RequestInit): Promise<Response> => {
      const request: FakeRequest = {
        url: String(input),
        method: init?.method ?? 'GET',
        headers: { ...(init?.headers as Record<string, string> | undefined) },
        body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
      };
      fake.calls.push(request);

      const reply = responder(request);
      if (reply instanceof Error) throw reply;
      if (reply.bytes !== undefined) {
        return new Response(reply.bytes as BodyInit, { status: reply.status, headers: reply.headers });
      }
      return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
        status: reply.status,
        headers: reply.headers,
      });
    });

    return fake;
  }

  public static restore(): void {
    vi.unstubAllGlobals();
  }
}
