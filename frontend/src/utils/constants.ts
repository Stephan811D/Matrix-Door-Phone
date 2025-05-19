const CONST = {
    TOPICS: {
        PRESENCE: {
            ID: "presence",
            NAME: "Presence",
            TOPIC_NAME: "house/presence"
        },
        DOORBELL: {
            ID: "doorbell",
            NAME: "Doorbell",
            TOPIC_NAME: "house/doorbell"
        },
        DOOR: {
            ID: "door",
            NAME: "Door",
            TOPIC_NAME: "house/door"
        },
        DOOR_OPENER: {
            ID: "doorOpener",
            NAME: "Door Opener",
            TOPIC_NAME: "house/doorOpener"
        }
    },
    PAGES: {
        LOADING_SCREEN: 0,
        AUTHENTICATION_SCREEN: 1,
        INTRO_SCREEN: 2,
        CALL_SCREEN: 3,
        RING_SCREEN: 4,
        DOOR_SCREEN: 5,
        ERROR_SCEEN: 6
    }
};

export default CONST;