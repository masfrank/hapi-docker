import React from 'react';
import { Box, Text } from 'ink';
import { logger } from '@/ui/logger';
import {
    RemoteLauncherBase,
    type RemoteLauncherDisplayContext,
    type RemoteLauncherExitReason
} from '@/modules/common/remote/RemoteLauncherBase';
import type { CursorSession } from './session';

class CursorRemoteLauncher extends RemoteLauncherBase {
    private readonly session: CursorSession;

    constructor(session: CursorSession) {
        super(process.env.DEBUG ? session.logPath : undefined);
        this.session = session;
    }

    public async launch(): Promise<RemoteLauncherExitReason> {
        return this.start({
            onExit: () => this.handleExitFromUi(),
            onSwitchToLocal: () => this.handleSwitchFromUi()
        });
    }

    protected createDisplay(context: RemoteLauncherDisplayContext): React.ReactElement {
        return React.createElement(
            Box,
            { flexDirection: 'column', padding: 1 },
            React.createElement(Text, { color: 'yellow' }, 'Cursor remote mode not yet supported.'),
            React.createElement(Text, {}, 'Run from terminal: hapi cursor')
        );
    }

    protected async runMainLoop(): Promise<void> {
        logger.debug('[cursor-remote]: Remote mode not supported, exiting');
        this.session.sendSessionEvent({
            type: 'message',
            message: 'Cursor remote mode not yet supported. Use terminal: hapi cursor'
        });
        this.exitReason = 'exit';
        this.shouldExit = true;
    }

    protected async cleanup(): Promise<void> {}

    private async handleExitFromUi(): Promise<void> {
        this.exitReason = 'exit';
        this.shouldExit = true;
    }

    private async handleSwitchFromUi(): Promise<void> {
        this.exitReason = 'switch';
        this.shouldExit = true;
    }
}

export async function cursorRemoteLauncher(session: CursorSession): Promise<'switch' | 'exit'> {
    const launcher = new CursorRemoteLauncher(session);
    return launcher.launch();
}
