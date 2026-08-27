const robloxUsersApiUrl = "https://users.roblox.com/v1/users";
const robloxGroupsApiUrl = "https://groups.roblox.com/v1/groups";
const robloxGamesApiUrl = "https://games.roblox.com/v1/games";
const robloxThumbnailsApiUrl = "https://thumbnails.roblox.com/v1";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJsonWithRetries(url, options = {}, retries = 3) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, options);
    if (response.ok) {
      return response.json();
    }

    const body = await response.text();
    lastError = new Error(`Roblox API (${response.status}): ${body}`);

    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === retries) {
      throw lastError;
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(30000, 2000 * (attempt + 1));
    await sleep(delayMs);
  }

  throw lastError;
}

// User APIs
async function getUserById(userId) {
  return requestJsonWithRetries(`${robloxUsersApiUrl}/${userId}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
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

async function getUserHeadshot(userId) {
  try {
    const data = await requestJsonWithRetries(
      `${robloxThumbnailsApiUrl}/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
    );
    return data?.data?.[0]?.imageUrl || null;
  } catch {
    return null;
  }
}

// Group APIs
async function getGroupInfo(groupId) {
  const groupData = await requestJsonWithRetries(`${robloxGroupsApiUrl}/${groupId}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  let iconUrl = null;
  try {
    const iconData = await requestJsonWithRetries(
      `${robloxThumbnailsApiUrl}/groups/icons?groupIds=${groupId}&size=150x150&format=Png`
    );
    iconUrl = iconData?.data?.[0]?.imageUrl || null;
  } catch {}

  return {
    ...groupData,
    iconUrl,
  };
}

async function getGroupRoles(groupId) {
  const payload = await requestJsonWithRetries(`${robloxGroupsApiUrl}/${groupId}/roles`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  return Array.isArray(payload?.roles) ? payload.roles : [];
}

// Game / Experience APIs
async function getPlaceDetails(placeId) {
  const data = await requestJsonWithRetries(
    `${robloxGamesApiUrl}/multiget-place-details?placeIds=${placeId}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );
  return data?.[0] || null;
}

async function getUniverseDetails(universeId) {
  const universeData = await requestJsonWithRetries(
    `${robloxGamesApiUrl}?universeIds=${universeId}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  let votes = { upVotes: 0, downVotes: 0 };
  try {
    const voteData = await requestJsonWithRetries(
      `${robloxGamesApiUrl}/votes?universeIds=${universeId}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      }
    );
    votes = voteData?.data?.[0] || votes;
  } catch {}

  let iconUrl = null;
  try {
    const iconData = await requestJsonWithRetries(
      `${robloxThumbnailsApiUrl}/games/icons?universeIds=${universeId}&size=150x150&format=Png`
    );
    iconUrl = iconData?.data?.[0]?.imageUrl || null;
  } catch {}

  const details = universeData?.data?.[0] || null;
  return {
    ...details,
    votes,
    iconUrl,
  };
}

module.exports = {
  getUserById,
  getUsersByIds,
  getUserHeadshot,
  getGroupInfo,
  getGroupRoles,
  getPlaceDetails,
  getUniverseDetails,
};
