import React, {Component, ReactNode} from 'react'
import Atmosphere from 'universal/Atmosphere'

let atmosphere = new Atmosphere()

export const AtmosphereContext = React.createContext(atmosphere)

export const resetAtmosphere = () => {
  atmosphere.close()
  atmosphere = new Atmosphere()
}

interface Props {
  children: ReactNode
  isDemo?: boolean
}

class AtmosphereProvider extends Component<Props> {
  constructor (props) {
    super(props)
    if (props.isDemo) {
      atmosphere = null
      import('universal/modules/demo/LocalAtmosphere')
        .then((mod) => {
          const LocalAtmosphere = mod.default
          atmosphere = new LocalAtmosphere()
          this.forceUpdate()
        })
        .catch()
    }
    // @ts-ignore
    if (typeof __CLIENT__ !== 'undefined' && __CLIENT__) {
      if (atmosphere && atmosphere.getAuthToken) {
        atmosphere.getAuthToken(window)
      }
    }
  }

  render () {
    if (!atmosphere) return null
    return (
      <AtmosphereContext.Provider value={atmosphere}>
        {this.props.children}
      </AtmosphereContext.Provider>
    )
  }
}

export default AtmosphereProvider
