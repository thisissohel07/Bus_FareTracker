/**
 * Auth Context
 * 
 * Provides global authentication state management
 * using React Context API + useReducer.
 */

import { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

// Auth reducer actions
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_ERROR: 'SET_ERROR',
};

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.LOGOUT:
      return { ...initialState, isLoading: false };
    case AUTH_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('busfare_token');
    const user = localStorage.getItem('busfare_user');

    if (token && user) {
      try {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { token, user: JSON.parse(user) },
        });
      } catch {
        localStorage.removeItem('busfare_token');
        localStorage.removeItem('busfare_user');
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    } else {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  const login = async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    try {
      const res = await authAPI.login({ email, password });
      const { user, token } = res.data.data;
      localStorage.setItem('busfare_token', token);
      localStorage.setItem('busfare_user', JSON.stringify(user));
      dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user, token } });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed.';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: message });
      return { success: false, message };
    }
  };

  const register = async (name, email, password) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    try {
      const res = await authAPI.register({ name, email, password });
      const { user, token } = res.data.data;
      localStorage.setItem('busfare_token', token);
      localStorage.setItem('busfare_user', JSON.stringify(user));
      dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user, token } });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed.';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: message });
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('busfare_token');
    localStorage.removeItem('busfare_user');
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
