import {commitMutation} from 'react-relay'
import {setLocalStageAndPhase} from 'universal/utils/relay/updateLocalStage'
import getInProxy from 'universal/utils/relay/getInProxy'
import {DISCUSS, VOTE} from 'universal/utils/constants'
import clientTempId from 'universal/utils/relay/clientTempId'
import createProxyRecord from 'universal/utils/relay/createProxyRecord'
import handleRemoveReflectionGroups from 'universal/mutations/handlers/handleRemoveReflectionGroups'
import isViewerTyping from 'universal/utils/isViewerTyping'
import isInterruptingChickenPhase from 'universal/utils/isInterruptingChickenPhase'
import getBaseRecord from 'universal/utils/relay/getBaseRecord'

graphql`
  fragment NavigateMeetingMutation_team on NavigateMeetingPayload {
    meeting {
      id
      facilitatorStageId
    }
    oldFacilitatorStage {
      id
      isComplete
    }
    phaseComplete {
      reflect {
        emptyReflectionGroupIds
      }
      group {
        meeting {
          reflectionGroups {
            ...CompleteReflectionGroupFrag @relay(mask: false)
          }
        }
      }
      vote {
        meeting {
          phases {
            id
            ... on DiscussPhase {
              phaseType
              stages {
                id
                isComplete
                isNavigable
                isNavigableByFacilitator
                meetingId
                phaseType
                reflectionGroup {
                  id
                  tasks {
                    id
                  }
                }
                sortOrder
              }
            }
          }
        }
      }
    }
    unlockedStages {
      id
      isNavigable
      isNavigableByFacilitator
    }
  }
`

const mutation = graphql`
  mutation NavigateMeetingMutation(
    $meetingId: ID!
    $completedStageId: ID
    $facilitatorStageId: ID
  ) {
    navigateMeeting(
      meetingId: $meetingId
      completedStageId: $completedStageId
      facilitatorStageId: $facilitatorStageId
    ) {
      error {
        message
      }
      ...NavigateMeetingMutation_team @relay(mask: false)
    }
  }
`

const optimisticallyCreateRetroTopics = (store, discussPhase, meetingId) => {
  if (!discussPhase || discussPhase.getLinkedRecords('stages').length > 1) {
    return
  }
  const meeting = store.get(meetingId)
  const reflectionGroups = meeting.getLinkedRecords('reflectionGroups')
  const topReflectionGroups = reflectionGroups.filter((group) => group.getValue('voteCount') > 0)
  topReflectionGroups.sort((a, b) => (a.getValue('voteCount') < b.getValue('voteCount') ? 1 : -1))
  const discussStages = topReflectionGroups.map((reflectionGroup) => {
    const reflectionGroupId = reflectionGroup.getValue('id')
    const proxyStage = createProxyRecord(store, 'RetroDiscussStage', {
      id: clientTempId(),
      meetingId,
      isComplete: false,
      phaseType: DISCUSS,
      reflectionGroupId
    })
    proxyStage.setLinkedRecord(reflectionGroup, 'reflectionGroup')
    return proxyStage
  })
  discussPhase.setLinkedRecords(discussStages, 'stages')
}

export const navigateMeetingTeamUpdater = (payload, store) => {
  const meetingId = getInProxy(payload, 'meeting', 'id')
  const meeting = store.get(meetingId)
  if (!meeting) return
  const viewerStageId = getInProxy(meeting, 'localStage', 'id')
  const facilitatorStageId = getInProxy(meeting, 'facilitatorStageId')
  const oldMeeting = getBaseRecord(store, meetingId)
  if (viewerStageId === oldMeeting.facilitatorStageId) {
    const viewerPhaseType = getInProxy(meeting, 'localPhase', 'phaseType')
    if (!isInterruptingChickenPhase(viewerPhaseType) || !isViewerTyping()) {
      setLocalStageAndPhase(store, meetingId, facilitatorStageId)
    }
  }

  const emptyReflectionGroupIds = getInProxy(
    payload,
    'phaseComplete',
    'reflect',
    'emptyReflectionGroupIds'
  )
  handleRemoveReflectionGroups(emptyReflectionGroupIds, meetingId, store)
}

const NavigateMeetingMutation = (atmosphere, variables, onError, onCompleted) => {
  return commitMutation(atmosphere, {
    mutation,
    variables,
    updater: (store) => {
      const payload = store.getRootField('navigateMeeting')
      if (!payload) return
      navigateMeetingTeamUpdater(payload, store)
    },
    optimisticUpdater: (store) => {
      const {meetingId, facilitatorStageId, completedStageId} = variables
      const meeting = store.get(meetingId)
      meeting.setValue(facilitatorStageId, 'facilitatorStageId')
      const phases = meeting.getLinkedRecords('phases')
      for (let ii = 0; ii < phases.length; ii++) {
        const phase = phases[ii]
        const stages = phase.getLinkedRecords('stages')
        const stage = stages.find((curStage) => curStage.getValue('id') === completedStageId)
        if (stage) {
          stage.setValue(true, 'isComplete')
          const phaseType = stage.getValue('phaseType')
          if (phaseType === VOTE) {
            const discussPhase = phases[ii + 1]
            optimisticallyCreateRetroTopics(store, discussPhase, meetingId)
          }
        }
      }
    },
    onCompleted,
    onError
  })
}

export default NavigateMeetingMutation
