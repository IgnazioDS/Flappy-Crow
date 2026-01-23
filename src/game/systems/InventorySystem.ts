import type { SaveState } from '../persistence/saveState'
import { DEFAULT_OWNED, DEFAULT_SELECTED } from '../store/catalog'
import type { CosmeticItem, CosmeticItemType } from '../store/types'

type InventorySelection = SaveState['inventory']['selected']

export class InventorySystem {
  private ownedSkins = new Set<string>()
  private ownedFrames = new Set<string>()
  private ownedTrails = new Set<string>()
  private selected: InventorySelection

  constructor(inventory: SaveState['inventory']) {
    for (const id of DEFAULT_OWNED.skins) {
      this.ownedSkins.add(id)
    }
    for (const id of DEFAULT_OWNED.frames) {
      this.ownedFrames.add(id)
    }
    for (const id of DEFAULT_OWNED.trails) {
      this.ownedTrails.add(id)
    }
    for (const id of inventory.ownedSkins) {
      this.ownedSkins.add(id)
    }
    for (const id of inventory.ownedFrames) {
      this.ownedFrames.add(id)
    }
    for (const id of inventory.ownedTrails) {
      this.ownedTrails.add(id)
    }

    this.selected = {
      skin: inventory.selected.skin ?? DEFAULT_SELECTED.skin,
      frame: inventory.selected.frame ?? DEFAULT_SELECTED.frame,
      trail: inventory.selected.trail ?? DEFAULT_SELECTED.trail,
    }

    this.ensureSelectionValid('skin', DEFAULT_SELECTED.skin)
    this.ensureSelectionValid('frame', DEFAULT_SELECTED.frame)
    this.ensureSelectionValid('trail', DEFAULT_SELECTED.trail)
  }

  isOwned(item: CosmeticItem): boolean {
    return this.getOwnedSet(item.type).has(item.id)
  }

  unlock(item: CosmeticItem): boolean {
    const owned = this.getOwnedSet(item.type)
    if (owned.has(item.id)) {
      return false
    }
    owned.add(item.id)
    return true
  }

  select(item: CosmeticItem): boolean {
    if (!this.isOwned(item)) {
      return false
    }
    const current = this.selected[item.type]
    if (current === item.id) {
      return false
    }
    this.selected[item.type] = item.id
    return true
  }

  isSelected(item: CosmeticItem): boolean {
    return this.selected[item.type] === item.id
  }

  getSelectedId(type: CosmeticItemType): string | null {
    return this.selected[type]
  }

  toInventoryState(): SaveState['inventory'] {
    return {
      ownedSkins: Array.from(this.ownedSkins).sort(),
      ownedTrails: Array.from(this.ownedTrails).sort(),
      ownedFrames: Array.from(this.ownedFrames).sort(),
      selected: {
        skin: this.selected.skin,
        trail: this.selected.trail,
        frame: this.selected.frame,
      },
    }
  }

  private ensureSelectionValid(type: CosmeticItemType, fallback: string | null): void {
    const owned = this.getOwnedSet(type)
    const selected = this.selected[type]
    if (selected && owned.has(selected)) {
      return
    }
    if (fallback && owned.has(fallback)) {
      this.selected[type] = fallback
      return
    }
    const firstOwned = owned.values().next().value as string | undefined
    this.selected[type] = firstOwned ?? null
  }

  private getOwnedSet(type: CosmeticItemType): Set<string> {
    switch (type) {
      case 'skin':
        return this.ownedSkins
      case 'frame':
        return this.ownedFrames
      case 'trail':
        return this.ownedTrails
    }
  }
}
