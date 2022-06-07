export default async function ({ data }) {
    if (data.type !== 'NewFriendRequestEvent') return
    data.agree();
}