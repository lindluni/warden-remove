const core = require("@actions/core");
const github = require("@actions/github");

(async function main() {
    const body = core.getInput('BODY', {required: true, trimWhitespace: true})
    const issueNumber = Number(core.getInput('ISSUE_NUMBER', {required: true, trimWhitespace: true}))
    const org = core.getInput('ORG', {required: true, trimWhitespace: true})
    const repo = core.getInput('REPO', {required: true, trimWhitespace: true}).trim()
    const token = core.getInput('TOKEN', {required: true, trimWhitespace: true})

    const filteredBody = body.substr(1, body.length - 2) // Trim quotes off end
    let username = filteredBody.match(new RegExp('GitHub Username.+'))[0].split('\\n\\n')[1].trim()
    if (username.startsWith('@')) {
        username = username.substr(1)
    }

    const client = await github.getOctokit(token)
    try {
        core.info(`Removing user ${username} from the ${org} org`)
        await client.rest.orgs.removeMembershipForUser({
            org: org,
            username: username
        })
        core.info(`Creating success comment`)
        await client.rest.issues.createComment({
            owner: org,
            repo: repo,
            issue_number: issueNumber,
            body: `${username} successfully removed from org`
        })
    } catch (e) {
        if (e.status === 404) {
            core.info(`User already removed from org`)
            await client.rest.issues.createComment({
                owner: org,
                repo: repo,
                issue_number: issueNumber,
                body: `User already removed from org`
            })
        } else {
            core.setFailed(`Failed removing user from org: ${e}`)
            await client.rest.issues.createComment({
                owner: org,
                repo: repo,
                issue_number: issueNumber,
                body: `Failed removing user from org: ${e.message}`
            })
            return
        }
    }

    try {
        core.info(`Closing issue ${org}/${repo}#${issueNumber}`)
        await client.rest.issues.update({
            owner: org,
            repo: repo,
            issue_number: issueNumber,
            state: 'closed'
        })
    } catch (e) {
        core.setFailed(`Failed reporting success or closing issue: ${e}`)
    }
})()
