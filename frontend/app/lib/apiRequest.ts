const inFlightGetRequests =
  new Map<
    string,
    Promise<Response>
  >();

const recentGetResponses =
  new Map<
    string,
    {
      response: Response;
      expiresAt: number;
      generation: number;
    }
  >();

const DEVELOPMENT_GET_REUSE_MS =
  process.env.NODE_ENV ===
  "development"
    ? 1000
    : 0;

let requestGeneration = 0;

function buildGetRequestKey(
  url: string,
  options: RequestInit,
  headers: Headers,
) {
  const headerEntries =
    Array.from(
      headers.entries(),
    ).sort(
      (
        [leftName],
        [rightName],
      ) =>
        leftName.localeCompare(
          rightName,
        ),
    );

  return JSON.stringify({
    url,
    headers:
      headerEntries,
    credentials:
      options.credentials ??
      null,
    cache:
      options.cache ??
      null,
    mode:
      options.mode ??
      null,
    redirect:
      options.redirect ??
      null,
    referrer:
      options.referrer ??
      null,
    referrerPolicy:
      options.referrerPolicy ??
      null,
    integrity:
      options.integrity ??
      null,
  });
}

function clearGetRequestReuse() {
  requestGeneration += 1;
  inFlightGetRequests.clear();
  recentGetResponses.clear();
}

export function fetchWithGetCoalescing(
  url: string,
  options: RequestInit = {},
) {
  const method =
    (
      options.method ??
      "GET"
    ).toUpperCase();

  if (
    method !== "GET" ||
    options.signal
  ) {
    if (
      method !== "GET" &&
      method !== "HEAD"
    ) {
      clearGetRequestReuse();
    }

    return fetch(
      url,
      options,
    );
  }

  const headers =
    new Headers(
      options.headers,
    );
  const key =
    buildGetRequestKey(
      url,
      options,
      headers,
    );
  const now =
    Date.now();
  const generation =
    requestGeneration;
  const recent =
    recentGetResponses.get(
      key,
    );

  if (
    recent &&
    recent.generation ===
      generation &&
    recent.expiresAt >
      now
  ) {
    return Promise.resolve(
      recent.response.clone(),
    );
  }

  if (recent) {
    recentGetResponses.delete(
      key,
    );
  }

  const inFlight =
    inFlightGetRequests.get(
      key,
    );

  if (inFlight) {
    return inFlight.then(
      (response) =>
        response.clone(),
    );
  }

  const request =
    fetch(
      url,
      options,
    ).then(
      (response) => {
        if (
          DEVELOPMENT_GET_REUSE_MS >
            0 &&
          response.ok &&
          generation ===
            requestGeneration
        ) {
          recentGetResponses.set(
            key,
            {
              response:
                response.clone(),
              expiresAt:
                Date.now() +
                DEVELOPMENT_GET_REUSE_MS,
              generation,
            },
          );
        }

        return response;
      },
    );

  inFlightGetRequests.set(
    key,
    request,
  );

  void request.then(
    () => {
      if (
        inFlightGetRequests.get(
          key,
        ) === request
      ) {
        inFlightGetRequests.delete(
          key,
        );
      }
    },
    () => {
      if (
        inFlightGetRequests.get(
          key,
        ) === request
      ) {
        inFlightGetRequests.delete(
          key,
        );
      }
    },
  );

  return request.then(
    (response) =>
      response.clone(),
  );
}
