# Exports chosen cars of the Low Poly Car Pack (aq3d-models, CGTrader) as one GLB each: modifiers applied, centred,
# standing on y=0, facing -Z; the paint on a plain white "Body" material (painted by the app), windows on "Glass".
# Then tools/assets/build-aq3d-cars.mjs makes the app's files. Needs Blender 5.2 (pip install bpy):
#
#   python export-aq3d-cars.py -- LowPolyFictionalVehiclePack.blend <out dir> '{"9":"hatchback",...}'
#
# (The picks the app uses are in content/assets/register.json, pack aq3d-low-poly-car-pack-20.)
import bpy,sys,math,json
from mathutils import Vector,Matrix
args=sys.argv[sys.argv.index('--')+1:]
src,outdir,picks=args[0],args[1],json.loads(args[2])
bpy.ops.wm.open_mainfile(filepath=src)
dg=bpy.context.evaluated_depsgraph_get()
body=bpy.data.materials.new('Body');body.use_nodes=True
b=body.node_tree.nodes['Principled BSDF'];b.inputs['Base Color'].default_value=(1,1,1,1);b.inputs['Roughness'].default_value=.35
glass={}
out={}
for num,name in picks.items():
    col=next(c for c in bpy.data.collections if c.name.startswith(f'CAR#{num}('))
    scene=bpy.context.scene;made=[]
    for x in bpy.context.view_layer.objects:x.select_set(False)
    for o in col.objects:
        if o.type!='MESH':continue
        e=o.evaluated_get(dg);me=bpy.data.meshes.new_from_object(e,preserve_all_data_layers=True,depsgraph=dg)
        me.transform(e.matrix_world)
        part=o.name.split('.')[0]
        if part=='paint':
            me.materials.clear();me.materials.append(body)
        elif part=='windows':
            for i,m in enumerate(me.materials):
                if m and m.name not in glass:
                    g=m.copy();g.name=f'Glass {m.name}';glass[m.name]=g
                if m:me.materials[i]=glass[m.name]
        n=bpy.data.objects.new(f'{name}-{o.name}',me);scene.collection.objects.link(n);made.append(n)
    pts=[v.co for n in made for v in n.data.vertices]
    lo=Vector((min(p.x for p in pts),min(p.y for p in pts),min(p.z for p in pts)));hi=Vector((max(p.x for p in pts),max(p.y for p in pts),max(p.z for p in pts)))
    # Centre, stand on the ground, turn round (front -Y to +Y, which glTF makes -Z).
    t=Matrix.Rotation(math.pi,4,'Z')@Matrix.Translation(Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)))
    for n in made:n.data.transform(t)
    for n in made:n.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f'{outdir}/{name}.glb',export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True)
    for n in made:bpy.data.objects.remove(n)
    d=hi-lo;out[name]={'length':round(d.y,2),'width':round(d.x,2),'height':round(d.z,2)}
print('SIZES',json.dumps(out))
