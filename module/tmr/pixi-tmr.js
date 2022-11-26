import { tmrConstants, tmrTokenZIndex } from "../tmr-constants.js";

const tooltipStyle = new PIXI.TextStyle({
  fontFamily: 'CaslonAntique',
  fontSize: 18,
  fill: '#FFFFFF',
  stroke: '#000000',
  strokeThickness: 3
});


export class PixiTMR {

  static textures = []

  constructor(tmrObject, pixiApp) {
    this.tmrObject = tmrObject;
    this.pixiApp = pixiApp ?? tmrObject.pixiApp;
    this.pixiApp.stage.sortableChildren = true;
    this.callbacksOnAnimate = [];
  }

  load( onLoad = (loader, resources) => {} ) {
    let loader = this.pixiApp.loader;
    for (const [name, img] of Object.entries(PixiTMR.textures)) {
      loader = loader.add(name, img);
    }
    loader.onError.add((error, reason) => { console.log("ERROR", error, reason) });
    loader.load( (loader, resources) =>  {
      onLoad(loader, resources);
      for (let onAnimate of this.callbacksOnAnimate) {
        onAnimate();
      }
    });
  }

  static register(name, img) {
    PixiTMR.textures[name] = img;
  }

  animate(animation = pixiApp=>{})
  {
    this.callbacksOnAnimate.push(() => animation(this.pixiApp));
  }

  carteTmr(code) {
    const carteTmr = new PIXI.Sprite(PIXI.utils.TextureCache[code]);
    // Setup the position of the TMR
    carteTmr.x = 0;
    carteTmr.y = 0;
    carteTmr.width = 720;
    carteTmr.height = 860;
    // Rotate around the center
    carteTmr.anchor.set(0);
    carteTmr.interactive = true;
    carteTmr.buttonMode = true;
    carteTmr.tmrObject = this;
    if (!this.tmrObject.viewOnly) {
      carteTmr.on('pointerdown', event => this.onClickBackground(event));
    }
    this.pixiApp.stage.addChild(carteTmr);
    return carteTmr;
  }

  sprite(code, options = {}) {
    const texture = PIXI.utils.TextureCache[code];
    if (!texture) {
      console.error("Texture manquante", code)
      return;
    }  
    let sprite = new PIXI.Sprite(texture);
    sprite.width = options.taille ?? tmrConstants.half;
    sprite.height = options.taille ?? tmrConstants.half;
    sprite.anchor.set(0.5);
    if (options.color) {
      sprite.tint = options.color;
    }
    sprite.zIndex = options.zIndex ?? tmrTokenZIndex.casehumide+1;
    sprite.alpha = options.alpha ?? 0.75;
    sprite.decallage = options.decallage ?? tmrConstants.center;
    this.pixiApp.stage.addChild(sprite);
    return sprite;
  }  
  
  circle(name, options = {}) {
    let sprite = new PIXI.Graphics();
    sprite.beginFill(options.color, options.opacity);
    sprite.drawCircle(0, 0, (options.taille ?? 12) / 2);
    sprite.endFill();
    sprite.decallage = options.decallage ?? tmrConstants.topLeft;
    this.pixiApp.stage.addChild(sprite);
    return sprite;
  }

  addTooltip(sprite, text) {
    if (text) {
      sprite.tooltip = new PIXI.Text(text, tooltipStyle);
      sprite.tooltip.zIndex = tmrTokenZIndex.tooltip;
      sprite.isOver = false;
      sprite.interactive = true;
      sprite.on('pointerdown', event => this.onClickBackground(event))
        .on('pointerover', () => this.onShowTooltip(sprite))
        .on('pointerout', () => this.onHideTooltip(sprite));
    }
  }
  

  onClickBackground(event) {
    this.tmrObject.onClickTMR(event)
  }

  onShowTooltip(sprite) {
    if (sprite.tooltip) {

      if (!sprite.isOver) {
        sprite.tooltip.x = sprite.x;
        sprite.tooltip.y = sprite.y;
        this.pixiApp.stage.addChild(sprite.tooltip);
      }
      sprite.isOver = true;
    }
  }

  onHideTooltip(sprite) {
    if (sprite.tooltip) {
      if (sprite.isOver) {
        this.pixiApp.stage.removeChild(sprite.tooltip);
      }
      sprite.isOver = false;
    }
  }

  setPosition( sprite, oddq) {
    let decallagePairImpair = (oddq.col % 2 == 0) ? tmrConstants.col1_y : tmrConstants.col2_y;
    let dx = (sprite.decallage == undefined) ? 0 : sprite.decallage.x;
    let dy = (sprite.decallage == undefined) ? 0 : sprite.decallage.y;
    sprite.x = tmrConstants.gridx + (oddq.col * tmrConstants.cellw) + dx;
    sprite.y = tmrConstants.gridy + (oddq.row * tmrConstants.cellh) + dy + decallagePairImpair;
  }

  getCaseRectangle(oddq) {
    let decallagePairImpair = (oddq.col % 2 == 0) ? tmrConstants.col1_y : tmrConstants.col2_y;
    let x = tmrConstants.gridx + (oddq.col * tmrConstants.cellw) - (tmrConstants.cellw / 2);
    let y = tmrConstants.gridy + (oddq.row * tmrConstants.cellh) - (tmrConstants.cellh / 2) + decallagePairImpair;
    return { x: x, y: y, w: tmrConstants.cellw, h: tmrConstants.cellh };
  }

}