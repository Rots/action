import PropTypes from 'prop-types'
import React, {Component} from 'react'
import LoadingView from 'universal/components/LoadingView/LoadingView'
import withAtmosphere from 'universal/decorators/withAtmosphere/withAtmosphere'
import AcceptTeamInviteMutation from 'universal/mutations/AcceptTeamInviteMutation'
import requireAuthAndRole from 'universal/decorators/requireAuthAndRole/requireAuthAndRole'
import {CREATE_ACCOUNT_SLUG} from 'universal/utils/constants'

class Invitation extends Component {
  static propTypes = {
    atmosphere: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired,
    match: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired
  }

  componentDidMount () {
    const {
      atmosphere,
      dispatch,
      match: {
        params: {inviteToken}
      },
      history
    } = this.props
    if (!inviteToken) return
    AcceptTeamInviteMutation(atmosphere, {inviteToken}, {dispatch, history})
  }

  render () {
    return (
      <div>
        <LoadingView />
      </div>
    )
  }
}

export default withAtmosphere(
  requireAuthAndRole({silent: true, unauthRoute: `/${CREATE_ACCOUNT_SLUG}`})(Invitation)
)
