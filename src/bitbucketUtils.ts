import axios from 'axios';

let accessToken: string | null = null;

export const getAccessToken = async () => {
  if (accessToken) {
    return accessToken;
  }

  const response = await axios.post<{ access_token: string }>(
    'https://bitbucket.org/site/oauth2/access_token',
    `grant_type=client_credentials&scopes=repository`,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      auth: {
        username: process.env.BITBUCKET_CLIENT_ID || '',
        password: process.env.BITBUCKET_CLIENT_SECRET || '',
      },
    },
  );

  accessToken = response.data.access_token;
  return accessToken;
};

const getHeaders = async () => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${await getAccessToken()}`,
});

const getApiBaseUrl = () => {
  return `https://api.bitbucket.org/2.0/repositories/${process.env.BITBUCKET_REPO_FULL_NAME}`;
};

interface GetPullRequestOptions {
  branch: string;
  destinationBranch: string;
}

export const getPullRequest = async ({ branch, destinationBranch }: GetPullRequestOptions) => {
  const query = `destination.branch.name="${destinationBranch}" AND source.branch.name="${branch}" AND state="OPEN"`;
  const response = await axios
    .get<{ values: { id: string }[] }>(`${getApiBaseUrl()}/pullrequests/?q=${query}`, {
      headers: await getHeaders(),
    })
    .catch(err => {
      console.error('Failed to get PR:', err.response?.data?.error?.message || err.message);
    });

  return response?.data?.values[0];
};

interface CreatePullRequestOptions {
  title: string;
  description: string;
  branch: string;
  destinationBranch: string;
}
export const createPullRequest = async ({
  title,
  description,
  branch,
  destinationBranch,
}: CreatePullRequestOptions) => {
  const response = await axios
    .post<unknown>(
      `${getApiBaseUrl()}/pullrequests`,
      JSON.stringify({
        title,
        description,
        source: {
          branch: {
            name: branch,
          },
        },
        destination: {
          branch: {
            name: destinationBranch,
          },
        },
        close_source_branch: true,
      }),
      {
        headers: await getHeaders(),
      },
    )
    .catch(err => {
      console.error('Failed to create PR:', err.response?.data?.error?.message || err.message);
    });

  return response?.data;
};

interface UpdatePullRequestOptions {
  id: string;
  title: string;
  description: string;
}
export const updatePullRequest = async ({ id, title, description }: UpdatePullRequestOptions) => {
  const response = await axios
    .put<unknown>(
      `${getApiBaseUrl()}/pullrequests/${id}`,
      JSON.stringify({
        title,
        description,
      }),
      {
        headers: await getHeaders(),
      },
    )
    .catch(err => {
      console.error('Failed to update PR:', err.response?.data || err.message);
    });

  return response?.data;
};
