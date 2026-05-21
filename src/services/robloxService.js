const robloxUsersApiUrl = "https://users.roblox.com/v1/users";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJsonWithRetries(url, options, retries = 6) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, options);
    if (response.ok) {
      return response.json();
    }

    const body = await response.text();
    lastError = new Error(`Roblox API gagal (${response.status}): ${body}`);

    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === retries) {
      throw lastError;
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(60000, 5000 * (attempt + 1));
    await sleep(delayMs);
  }

  throw lastError;
}

async function getUsersByIds(userIds) {
  const payload = await requestJsonWithRetries(robloxUsersApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ userIds }),
  });

  return Array.isArray(payload?.data) ? payload.data : [];
}

async function getUserById(userId) {
  return requestJsonWithRetries(`${robloxUsersApiUrl}/${userId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
}

module.exports = {
  getUserById,
  getUsersByIds,
};
