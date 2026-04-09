import { createContext, useContext } from 'react';

export const WorkforceContext = createContext();

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAYNAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAYSHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
export const defaultRules = { grace: 15, lateN: 3, lateType: 'halfday', lateFixed: 500 };

export const useWorkforce = () => useContext(WorkforceContext);
