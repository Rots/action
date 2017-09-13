import adjustUserCount from 'server/billing/helpers/adjustUserCount';
import getRethink from 'server/database/rethinkDriver';
import addUserToTMSUserOrg from 'server/safeMutations/addUserToTMSUserOrg';
import insertNewTeamMember from 'server/safeMutations/insertNewTeamMember';
import getTeamInviteNotifications from 'server/safeQueries/getTeamInviteNotifications';
import {auth0ManagementClient} from 'server/utils/auth0Helpers';
import getPubSub from 'server/utils/getPubSub';
import {ADD_USER} from 'server/utils/serverConstants';
import {JOIN_TEAM} from 'universal/subscriptions/constants';
import {ADD_TO_TEAM, NOTIFICATIONS_ADDED, NOTIFICATIONS_CLEARED} from 'universal/utils/constants';
import {getUserId} from 'server/utils/authorization';
import tmsSignToken from 'server/utils/tmsSignToken';

const acceptTeamInvite = async (teamId, authToken, email, mutatorId) => {
  const r = getRethink();
  const now = new Date();
  const userId = getUserId(authToken);

  const {team: {orgId, name: teamName}, user} = await r({
    orgId: r.table('Team').get(teamId).pluck('orgId', 'name'),
    user: r.table('User').get(userId)
  });
  const userOrgs = user.userOrgs || [];
  const userTeams = user.tms || [];
  const userInOrg = Boolean(userOrgs.find((org) => org.id === orgId));
  const tms = [...userTeams, teamId];
  const {expireInviteNotificationIds} = await r({
    // add the team to the user doc
    userUpdate: addUserToTMSUserOrg(userId, teamId, orgId),
    newTeamMember: insertNewTeamMember(userId, teamId),
    // find all possible emails linked to this person and mark them as accepted
    expireEmailInvitations: r.table('Invitation')
      .getAll(user.email, email, {index: 'email'})
      .update({
        acceptedAt: now,
        // flag the token as expired so they cannot reuse the token
        tokenExpiration: new Date(0),
        updatedAt: now
      }),
    expireInviteNotificationIds: getTeamInviteNotifications(orgId, teamId, [email])
      .delete({returnChanges: true})('changes')
      .map((change) => change('new_val')('id'))
      .default([])
  });

  if (!userInOrg) {
    await adjustUserCount(userId, orgId, ADD_USER);
  }
  auth0ManagementClient.users.updateAppMetadata({id: userId}, {tms});

  // Clear all invitiation notifications
  if (expireInviteNotificationIds.length > 0) {
    const notificationsCleared = {deletedIds: expireInviteNotificationIds};
    getPubSub().publish(`${NOTIFICATIONS_CLEARED}.${userId}`, {notificationsCleared});
  }

  // Tell the team who just joined
  const notificationsAdded = {
    notifications: [{
      type: JOIN_TEAM,
      teamName,
      preferredName: user.preferredName || user.email
    }]
  };
  getPubSub().publish(`${NOTIFICATIONS_ADDED}.${teamId}`, {notificationsAdded});

  // Send the new team member a welcome & a new token
  const addedToTeam = {
    type: ADD_TO_TEAM,
    authToken: tmsSignToken(authToken, tms),
    teamName,
    teamId
  };
  getPubSub().publish(`${NOTIFICATIONS_ADDED}.${userId}`, {notificationsAdded: {notifications: [addedToTeam]}, mutatorId});
  return addedToTeam;
};

export default acceptTeamInvite;
