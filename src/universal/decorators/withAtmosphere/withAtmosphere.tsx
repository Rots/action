import React, {Component} from 'react'
import {Subtract} from 'types/generics'
import getDisplayName from 'universal/utils/getDisplayName'
import {AtmosphereContext} from '../../components/AtmosphereProvider/AtmosphereProvider'

export interface WithAtmosphereProps {
  atmosphere: any
}

export default <P extends WithAtmosphereProps>(ComposedComponent: React.ComponentType<P>) => {
  return class WithAtmosphere extends Component<Subtract<P, WithAtmosphereProps>> {
    static displayName = `WithAtmosphere(${getDisplayName(ComposedComponent)})`

    render () {
      return (
        <AtmosphereContext.Consumer>
          {(atmosphere) => <ComposedComponent atmosphere={atmosphere} {...this.props} />}
        </AtmosphereContext.Consumer>
      )
    }
  }
}
