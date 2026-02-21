/**
 * clickable.ts
 *
 * Attaches a Babylon.js pointer-pick action to a mesh so clicking it
 * fires a named event through the EventBus.
 */

import { ActionManager, ExecuteCodeAction } from '@babylonjs/core';
import type { AbstractMesh, Scene } from '@babylonjs/core';
import type { ClickableComponent } from '../../schema/game.schema';
import type { EventBus } from '../bus/EventBus';

export function attachClickable(
    mesh: AbstractMesh,
    component: ClickableComponent,
    scene: Scene,
    bus: EventBus,
): void {
    if (!mesh.actionManager) {
        mesh.actionManager = new ActionManager(scene);
    }

    mesh.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
            bus.publish(component.event, { nodeId: mesh.name });
        }),
    );
}
