// This is a standard document regarding the modification of parameters during playing.
{
    // use "default"
    _default: {
        position: {
            x: 0;
            y: 0;
            z: 0;
        } // THREE pos
        rotation: {
            x: 0;
            y: 0;
            z: 0;
        } // angle
        scale: {
            x: 1;
            y: 1;
            z: 1;
        }
        notes: {
            position: (a) => {
                return {
                    x: 0,
                    y: 0,
                    z: 0,
                };
            };
            rotation: {
                x: 0;
                y: 0;
                z: 0;
            }
            scale: {
                x: 1;
                y: 1;
                z: 1;
            }
        }
        tracks: {
            // "left", "right", "up" or "down"
            left: {
                position: {
                    x: 0;
                    y: 0;
                    z: 0;
                }
                rotation: {
                    x: 0;
                    y: 0;
                    z: 0;
                }
                scale: {
                    x: 1;
                    y: 1;
                    z: 1;
                }
                notes: {
                    position: (a) => {
                        return {
                            x: 0,
                            y: 0,
                            z: 0,
                        };
                    };
                    rotation: {
                        x: 0;
                        y: 0;
                        z: 0;
                    }
                    scale: {
                        x: 1;
                        y: 1;
                        z: 1;
                    }
                }
            }
        }
    }
}
