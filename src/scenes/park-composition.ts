/**
 * The park laid out from a painting (session 18).
 *
 * The opening scene is to look exactly like the reference painting, so
 * every plate of the park declares where it is in the painting — its
 * box in the painting's own pixels — and this module puts it in the
 * world so that, from the seat, it lands there again. The trick is one
 * fixed eye: a camera at the seat, seeing the painting's frame through
 * the composition's field of view. A box's pixels are unprojected
 * through that eye onto the plate's plane (a wall at z, or the ground
 * at baseY), a grid of them so a plane seen at a slant stays exact, and
 * the image is mapped to the grid by the same pixels. Seen from the
 * seat the plates stack back into the painting; seen from anywhere
 * else they are things at honest distances that move apart.
 *
 * The images are the painting taken apart (scripts/reference-layers.mjs):
 * whole-frame layers the size of the painting — sky, far shore, water,
 * shore, lawn, trees — mapped by their own pixels, and elements redrawn
 * large on white, keyed and trimmed, fitted into their measured box.
 */
import * as THREE from 'three';
import type { Plate, Scene } from './manifest';
import { plateUrl } from './loading';

export interface CompositionPlate {
  def: Plate;
  /** One layer per image key, the season's weight cross-fading them. */
  layers: { key: string; mat: THREE.MeshBasicMaterial; mesh: THREE.Mesh }[];
  ready: boolean;
  opened: Promise<void>;
  /** Nearest z of the plate: for the render order and for `feet`. */
  z: number;
}

export interface Composition {
  plates: CompositionPlate[];
  /** The eye the layout was made from: the seat. */
  eye: THREE.PerspectiveCamera;
  /** The vertical field of view that covers the frame at this aspect. */
  fovFor(aspect: number): number;
}

const GRID_STAND = 10;
const GRID_LAY = 28;

export function buildComposition(
  group: THREE.Group,
  def: Scene,
  loader: THREE.TextureLoader,
  onMaterial?: (mat: THREE.MeshBasicMaterial, p: Plate) => void,
): Composition | null {
  const comp = def.composition;
  const from = def.camera?.from;
  if (!comp || !from) return null;
  const [FW, FH] = comp.frame;
  const eye = new THREE.PerspectiveCamera(comp.fov, FW / FH, 0.1, 1000);
  eye.position.set(0, from.y, from.z);
  eye.lookAt(0, from.lookY, 0);
  eye.updateMatrixWorld(true);
  eye.updateProjectionMatrix();

  const fovFor = (aspect: number) => {
    // Cover: a viewport wider than the frame sees less of its height.
    const half = Math.tan((comp.fov * Math.PI) / 360);
    const frameAspect = FW / FH;
    return aspect > frameAspect ? (Math.atan((half * frameAspect) / aspect) * 360) / Math.PI : comp.fov;
  };

  const ray = new THREE.Ray();
  const ndc = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const wall = new THREE.Plane();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  /** The world point the painting's pixel (px, py) sees on a plane. */
  const unproject = (px: number, py: number, plane: THREE.Plane, out: THREE.Vector3): boolean => {
    ndc.set((px / FW) * 2 - 1, 1 - (py / FH) * 2, 0.5).unproject(eye);
    ray.origin.copy(eye.position);
    ray.direction.copy(ndc).sub(eye.position).normalize();
    return ray.intersectPlane(plane, out) !== null;
  };

  const plates: CompositionPlate[] = [];
  for (const [index, p] of (def.plates ?? []).entries()) {
    if (!p.ref || !p.images) continue;
    const [bx, by, bw, bh] = p.ref;
    const baseY = p.baseY ?? 0;
    // The plane the plate lives on. Standing plates whose feet are on
    // the ground find their z where the box's bottom row meets it.
    let z = p.z;
    if (p.feet && !p.lay) {
      floor.constant = -baseY;
      if (unproject(bx + bw / 2, by + bh, floor, hit)) z = hit.z;
    }
    const cp: CompositionPlate = { def: p, layers: [], ready: false, opened: Promise.resolve(), z };
    plates.push(cp);

    // Everything below needs the image's own size, so the mesh is built
    // when it arrives; until then the plate is nothing, and the frame
    // waits for the opening season through `opened`.
    const build = (key: string, tex: THREE.Texture, i: number) => {
      const iw = (tex.image as HTMLImageElement).width;
      const ih = (tex.image as HTMLImageElement).height;
      const whole = Math.abs(iw / ih - FW / FH) < 0.01 && iw >= FW * 0.9;
      // The image's box in the painting: the whole frame for a whole-
      // frame layer, else the element's measured box, or what a
      // completed element's trusted side makes of it.
      let ix = bx, iy = by, iw2 = bw, ih2 = bh;
      if (whole) {
        ix = 0; iy = 0; iw2 = FW; ih2 = FH;
      } else if (p.fit === 'w') {
        ih2 = (bw * ih) / iw;
      } else if (p.fit === 'h') {
        iw2 = (bh * iw) / ih;
        ix = bx + bw - iw2;
      } else {
        const s = Math.min(bw / iw, bh / ih);
        iw2 = iw * s;
        ih2 = ih * s;
        ix = bx + (bw - iw2) / 2;
        iy = by + bh - ih2;
      }
      // Sample the image's box on a grid and unproject each sample onto
      // the plane: exact wherever the plane is seen at a slant.
      const n = p.lay ? GRID_LAY : GRID_STAND;
      const pos: number[] = [];
      const uv: number[] = [];
      const idx: number[] = [];
      let plane: THREE.Plane;
      if (p.lay) {
        floor.constant = -baseY;
        plane = floor;
      } else {
        wall.set(new THREE.Vector3(0, 0, 1), -z);
        plane = wall;
      }
      // Rows of a lying plate that reach the horizon never meet the
      // ground: clamp the far row to where a ray still lands.
      const farRow = (() => {
        if (!p.lay) return iy;
        let top = iy;
        const step = ih2 / 200;
        while (top < iy + ih2 && (!unproject(ix + iw2 / 2, top, plane, hit) || hit.z > eye.position.z || eye.position.z - hit.z > 400)) top += step;
        return top;
      })();
      const y0 = Math.max(iy, farRow);
      const h2 = iy + ih2 - y0;
      let farZ = z;
      for (let r = 0; r <= n; r++) {
        for (let c = 0; c <= n; c++) {
          const px = ix + (iw2 * c) / n;
          const py = y0 + (h2 * r) / n;
          if (!unproject(px, py, plane, hit)) hit.set(0, baseY, z);
          farZ = Math.min(farZ, hit.z);
          pos.push(hit.x, hit.y, hit.z);
          uv.push((px - ix) / iw2, 1 - (py - iy) / ih2);
        }
      }
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const a = r * (n + 1) + c;
          const b = a + 1;
          const d = a + n + 1;
          const e = d + 1;
          idx.push(a, d, b, b, d, e);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeBoundingSphere();
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = 8;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, fog: false });
      onMaterial?.(mat, p);
      const mesh = new THREE.Mesh(geo, mat);
      // Back to front by depth: the nearest plate draws last. Lying
      // plates order by their far edge, so whatever stands on them wins;
      // two that share one order draw in the manifest's order. The
      // range sits between the drawn world's sky (−10) and its people:
      // the sun and its trail pass between the sky and the far shore.
      const orderZ = p.lay ? farZ - 0.5 : z;
      mesh.renderOrder = orderZ / 20 - 1.3 + index * 0.001 + i * 0.0001;
      mesh.frustumCulled = false;
      mesh.name = `${p.id}:${key}`;
      group.add(mesh);
      cp.layers.push({ key, mat, mesh });
    };

    const keys = Object.keys(p.images);
    const load = (key: string, i: number) =>
      loader.loadAsync(plateUrl(p.images![key])).then((tex) => build(key, tex, i));
    // The season the piece opens on first; the rest of the year behind it.
    const [first, ...rest] = keys;
    cp.opened = load(first, 0)
      .then(() => {
        cp.ready = true;
        Promise.all(rest.map((k, i) => load(k, i + 1))).catch((err) => {
          console.warn(`[composition] ${p.id}: a season's imagery failed to load`, err);
        });
      })
      .catch((err) => {
        console.warn(`[composition] ${p.id}: imagery failed to load`, err);
      });
  }
  return { plates, eye, fovFor };
}
