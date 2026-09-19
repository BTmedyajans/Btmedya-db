import sys,json
kf=json.loads(sys.argv[1])
e=f"{kf[-1][1]:.1f}"
for (t0,y0),(t1,y1) in list(zip(kf,kf[1:]))[::-1]:
    s=(y1-y0)/(t1-t0)
    e=f"if(lt(t,{t1:.4f}),({y0:.1f}+({s:.4f})*(t-{t0:.4f})),{e})"
print(e)
