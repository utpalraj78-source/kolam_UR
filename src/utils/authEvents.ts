export const AUTH_EVENT = "auth-change";

export const triggerAuthUpdate = () => {
    window.dispatchEvent(new Event(AUTH_EVENT));
};
