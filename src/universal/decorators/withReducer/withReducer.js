import React, {Component} from 'react'
import makeReducer from 'universal/redux/makeReducer'
import {ReactReduxContext} from 'react-redux'

export default (reducerObj) => (ComposedComponent) => {
  class WithReducer extends Component {
    componentWillMount () {
      const store = this.context
      console.log('store', store)
      if (!Object.keys(store).length) {
        setTimeout(() => {
          console.log('store again', store)
        }, 1000)
        return
      }
      const newReducers = makeReducer(reducerObj)
      store.replaceReducer(newReducers)
    }

    render () {
      return <ComposedComponent {...this.props} />
    }
  }
  WithReducer.contextType = ReactReduxContext
  return WithReducer
}
