import PropTypes from 'prop-types';
import React from 'react';
import {DragDropContext as dragDropContext} from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import {Switch} from 'react-router-dom';
import {socketClusterReducer} from 'redux-socket-cluster';
import AsyncRoute from 'universal/components/AsyncRoute/AsyncRoute';
import QueryRenderer from 'universal/components/QueryRenderer/QueryRenderer';
import socketWithPresence from 'universal/decorators/socketWithPresence/socketWithPresence';
import NotificationsAddedSubscription from 'universal/subscriptions/NotificationsAddedSubscription';
import {DEFAULT_TTL} from 'universal/utils/constants';
import withReducer from '../../decorators/withReducer/withReducer';
import withAtmosphere from 'universal/decorators/withAtmosphere/withAtmosphere';
import NotificationClearedSubscription from 'universal/subscriptions/NotificationClearedSubscription';

const dashWrapper = () => System.import('universal/components/DashboardWrapper/DashboardWrapper');
const meetingContainer = () => System.import('universal/modules/meeting/containers/MeetingContainer/MeetingContainer');

// TODO remove ephemeral things like NotifyAddedToTeam and facilitatorRequest
const query = graphql`
  query SocketRouteQuery {
    viewer {
      notifications {
        edges {
          node {
            id
            orgId
            startAt
            type
            ... on NotifyAddedToTeam {
              authToken
              teamName
              teamId
            }
            ... on NotifyDenial {
              reason
              deniedByName
              inviteeEmail
            }
            ... on NotifyFacilitatorRequest {
              requestorName
              requestorId
            }
            ... on NotifyInvitation {
              inviterName
              inviteeEmail
              teamId
              teamName
            }
            ... on NotifyPayment {
              last4
              brand
            }
            ... on NotifyPromotion {
              groupName
            }
            ... on NotifyTeamArchived {
              teamName
            }
            ... on NotifyTrial {
              trialExpiresAt
            }
          }
        }    
      }
    }
  }
`;

const subscriptions = [
  NotificationsAddedSubscription,
  NotificationClearedSubscription
];

const cacheConfig = {ttl: DEFAULT_TTL};

const SocketRoute = ({atmosphere}) => {
  return (
    <QueryRenderer
      cacheConfig={cacheConfig}
      environment={atmosphere}
      query={query}
      variables={{}}
      subscriptions={subscriptions}
      render={({props: renderProps}) => {
        const notifications = renderProps ? renderProps.viewer.notifications : undefined;
        return (
          <Switch>
            <AsyncRoute isAbstract path="(/me|/newteam|/team)" mod={dashWrapper} extraProps={{notifications}} />
            <AsyncRoute
              path="/meeting/:teamId/:localPhase?/:localPhaseItem?"
              mod={meetingContainer}
              extraProps={{notifications}}
            />
          </Switch>
        );
      }}

    />
  );
};

SocketRoute.propTypes = {
  match: PropTypes.object.isRequired,
  atmosphere: PropTypes.object.isRequired

};

export default
withAtmosphere(
  withReducer({socket: socketClusterReducer})(
    dragDropContext(HTML5Backend)(
      socketWithPresence(
        SocketRoute
      )
    )
  )
);
