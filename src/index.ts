import fetch from "node-fetch";

export type Occurence = {
  issue: {
    code: string;
    title: string;
    category: string;
    tags: string[];
  };

  path: string;
  beginLine: number;
  beginColumn: number;
  endLine: number;
  endColumn: number;
};

export type Check = {
  analyzer: string;
  occurrences: Occurence[];
};

export type Repo = {
  defaultBranch: string;
  dsn: string;
  isPrivate: boolean;
  runIds: string[];
};

export default class DeepSourceAPI {
  private readonly PAT: string;

  private static readonly OccurenceQLQuery: string = `
    edges {
      node {
        path
          beginLine
          beginColumn
          endLine
          endColumn
          title
          issue {
            shortcode
            title
            category
            tags
          }
        }
      }
  `;

  /**
   * GraphQL query to get all issues in the default branch of a repo
   */
  private static readonly AllIssuesQuery = `
    defaultBranch
      issues {
        totalCount
        edges {
          node {
            occurrences {
              ${DeepSourceAPI.OccurenceQLQuery}
            }
          }
        }
      }
    `;

  public static readonly ApiUrl = "https://api.deepsource.io/graphql/";

  constructor(pat: string) {
    this.PAT = pat;
  }

  /**
   * @param query A graphQL query for the https://api.deepsource.io/graphql
   * @returns response from the API
   */
  async fetch(query: string): Promise<Record<string, any>> {
    const data = await fetch(DeepSourceAPI.ApiUrl, {
      method: "POST",
      body: JSON.stringify({ query }),
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        Authorization: `Bearer ${this.PAT}`,
      },
    });

    return await data.json();
  }

  /**
   * @param occurrence The GraphQL response representing an issue occurrence.
   * @returns An issue occurrence object
   */
  private convertOccurence(occurrence: Record<string, any>): Occurence {
    const { issue, path, beginColumn, beginLine, endColumn, endLine } =
      occurrence.node;

    return {
      issue: {
        code: issue.shortcode,
        title: issue.title,
        category: issue.category,
        tags: issue.tags,
      },
      path,
      beginColumn,
      beginLine,
      endColumn,
      endLine,
    };
  }

  /**
   * @param resp A response object from the DeepSource GraphQL API when queried for checks.
   * @returns A list of checks
   */
  private extractChecksFromGqlResponse(resp: Record<string, any>): Check[] {
    const { checks } = resp.data.run;
    const analyzers = checks.edges.map((edge: Record<string, any>) => {
      const { name } = edge.node.analyzer;
      const occurrences = edge.node.occurrences.edges;
      return {
        name,
        occurrences: occurrences.map((occurrence: Record<string, any>) =>
          this.convertOccurence(occurrence)
        ),
      };
    });

    return analyzers;
  }

  /**
   * Get the list of checks by run ID
   * @param runID Unique ID identifying a DeepSource analysis run on a project.
   * @returns An array of check where every check represents a language analyzer,
   * and the list of issues raised by it.
   */
  async getChecksByRunId(runID: string): Promise<Check[] | null> {
    const resp = await this.fetch(`query {
      run(runUid:"${runID}") {
        checks {
          totalCount
          edges {
              node {
                  analyzer { name }
                  occurrences { ${DeepSourceAPI.OccurenceQLQuery} }
              }
          }
      }
      }
    }`);

    if (!resp) return null;
    return this.extractChecksFromGqlResponse(resp);
  }

  /**
   *
   * @param resp Response from the DeepSource GraphQL API when queried for information about a repository.
   * @returns An object containing data about a repo that has DeepSource analysis activated on it.
   */
  private getRepoDataFromGqlResponse(resp: Record<string, any>): Repo {
    const repoData = resp.data.repository;
    return {
      defaultBranch: repoData.defaultBranch,
      dsn: repoData.dsn,
      isPrivate: repoData.isPrivate,
      runIds: repoData.analysisRuns.edges.map(
        (edge: Record<string, any>) => edge.node.runUid
      ),
    };
  }

  async getRepo(
    name: string,
    login: string,
    vcsProvider = "GITHUB",
    numRunIds = 1
  ): Promise<Repo | null> {
    const gqlResp = await this.fetch(`query {
      repository(
          name:"${name}",
          login:"${login}"
          vcsProvider:${vcsProvider}
        ) {
        defaultBranch
        dsn
        isPrivate
        analysisRuns(first:${numRunIds}) {
          edges { node { runUid } } 
        }
      }
    }`);

    if (typeof gqlResp === "object" && typeof gqlResp.data !== "undefined") {
      return this.getRepoDataFromGqlResponse(gqlResp);
    }

    return null;
  }

  async getAllIssuesInRepo(name: string, login: string, vcs = "GITHUB") {
    const gqlQuery = `{
      repository(
        name:"${name}",
        login:"${login}",
        vcsProvider:${vcs}
      ) {
        ${DeepSourceAPI.AllIssuesQuery}
      }
  }`;

    const gqlResp = await this.fetch(gqlQuery);

    if (typeof gqlResp === "object" && typeof gqlResp.data !== "undefined") {
      const issues = gqlResp.data.repository.issues.edges.map(
        (qlNode: Record<string, any>) => qlNode.node.occurrences.edges
      );
      return issues
        .flat()
        .map((occurrence: Record<string, any>) =>
          this.convertOccurence(occurrence)
        );
    }

    return null;
  }
}
