"""Lane paths for staged road users: a road's centreline (scene metres) offset to one side, between two distances
along it, in either direction. Used to write the actors of tools/scenes/stage.cjs specs.

  from lane_path import lane_path
  lane_path(points, offset_left=1.75, start=..., end=..., reverse=False)  # list of {x, z}
"""
import math

def _cum(pts):
    out=[0.0]
    for a,b in zip(pts,pts[1:]):out.append(out[-1]+math.hypot(b[0]-a[0],b[1]-a[1]))
    return out

def point_at(pts,s):
    """Point and unit direction at distance s along the polyline (clamped, extended past the ends)."""
    c=_cum(pts)
    i=0
    while i<len(pts)-2 and c[i+1]<s:i+=1
    a,b=pts[i],pts[i+1];L=c[i+1]-c[i] or 1
    t=(s-c[i])/L
    d=((b[0]-a[0])/L,(b[1]-a[1])/L)
    return (a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t),d

def lane_path(pts,offset_left,start,end,step=5.0):
    """Points from `start` to `end` metres along the centreline (end < start: driven the other way), each `offset_left`
    metres to the left of the direction of travel (x east, z south; heading 0 north)."""
    out=[]
    n=max(2,int(abs(end-start)/step)+1)
    sign=1 if end>=start else -1
    for k in range(n+1):
        s=start+(end-start)*k/n
        (x,z),(dx,dz)=point_at(pts,s)
        dx,dz=dx*sign,dz*sign
        # Left of travel: (dz, -dx) with z to the south (heading 0 = -z).
        out.append({'x':round(x+dz*offset_left,2),'z':round(z-dx*offset_left,2)})
    return out

def along(pts,x,z):
    """Distance along the polyline of the point nearest (x, z)."""
    c=_cum(pts);best=(1e18,0)
    for i,(a,b) in enumerate(zip(pts,pts[1:])):
        L=c[i+1]-c[i] or 1;t=max(0,min(1,((x-a[0])*(b[0]-a[0])+(z-a[1])*(b[1]-a[1]))/L/L))
        q=(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t);dd=math.hypot(q[0]-x,q[1]-z)
        if dd<best[0]:best=(dd,c[i]+t*L)
    return best[1]
