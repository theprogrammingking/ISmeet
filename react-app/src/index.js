import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import { applyMiddleware, compose, createStore } from 'redux';
import { Provider, useSelector } from 'react-redux';
import thunk from 'redux-thunk';
import rootReducer from './Reducers'
import { getFirebase, isLoaded, ReactReduxFirebaseProvider } from 'react-redux-firebase';
import firebaseConfig from './Utils/firebase'


const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store = createStore(rootReducer, composeEnhancers(
  applyMiddleware(thunk.withExtraArgument({getFirebase})),

))

// ReactReduxFirebaseProvider props
const rrfProps = {
  firebase: firebaseConfig,
  config: {},  // for firestore
  dispatch: store.dispatch
}

// Get Authentication Status before rendering children
function AuthIsLoaded({ children }) {
  const auth = useSelector(state => state.firebase.auth)
  if (!isLoaded(auth)) return <p>Loading Authentication Status</p>;
  return children
}

ReactDOM.render(
  <Provider store={store}>
    <ReactReduxFirebaseProvider {...rrfProps}>
      <AuthIsLoaded>
        <App />
      </AuthIsLoaded>
    </ReactReduxFirebaseProvider>
  </Provider>,
  document.getElementById('root')
);
