"""Pack texture data into the copied Blender source projects for portability.
Run: blender -b --factory-startup --python tools/pack-authoring.py
Only authoring .blend files are saved; accepted runtime GLB files are untouched.
"""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
records=[]
for project in sorted((ROOT/'authoring/characters').glob('*/*.blend')):
 bpy.ops.wm.open_mainfile(filepath=str(project))
 bpy.context.preferences.filepaths.save_version=0
 images=[]
 for image in bpy.data.images:
  if image.source!='FILE':continue
  source=ROOT/'public/assets/characters'/project.parent.name/Path(bpy.path.abspath(image.filepath)).name
  if not source.is_file():raise RuntimeError('Missing source texture '+str(source))
  image.filepath=str(source);image.reload();image.pack()
  image.filepath=bpy.path.relpath(str(source),start=str(project.parent))
  images.append({'name':image.name,'relativePath':image.filepath,'packed':bool(image.packed_file)})
 bpy.ops.wm.save_as_mainfile(filepath=str(project))
 if not all(x['packed'] for x in images):raise RuntimeError('Unpacked texture')
 records.append({'project':str(project.relative_to(ROOT)),'images':images})
(ROOT/'evidence/deployment/blender-portability.json').write_text(json.dumps({'passed':True,'projects':records,'runtimeGLBModified':False},indent=2)+'\n')
