#!/usr/bin/env python3
"""Sophia: daily, metadata-only catalogue of ALL public enuminous GitHub repositories.

Records every eligible default-branch blob and labels documents, data/results,
and reproducibility sources. No scientific PASS/FAIL is inferred. No source
repository is modified. Errors and truncated trees are flagged explicitly.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.github.com"
DOC = {".md",".mdx",".markdown",".rst",".txt",".text",".pdf",".doc",".docx",
       ".odt",".rtf",".tex",".typ",".html",".htm",".ipynb",".ppt",".pptx",".epub"}
DATA = {".csv",".tsv",".jsonl",".ndjson",".parquet",".arrow",".feather",
        ".xlsx",".xls",".h5",".hdf5",".npz",".npy",".sqlite",".db",".log",".out"}
CODE = {".lean",".v",".agda",".thy",".py",".r",".jl",".rs",".js",".ts",
        ".tsx",".jsx",".sh",".bash",".c",".h",".cc",".cpp",".java",".m",".ipynb"}
MEDIA = {".png",".jpg",".jpeg",".gif",".webp",".svg",".mp3",".wav",
         ".flac",".ogg",".mp4",".mov"}
RESULT = re.compile(
    r"(^|[/_.-])(result|results|evidence|report|reports|experiment|experiments|"
    r"audit|audits|benchmark|benchmarks|metric|metrics|score|scores|"
    r"ledger|ledgers|finding|findings|evaluation|eval|validation|"
    r"verification|proof|proofs|replication|replay|trace|traces|"
    r"diagnostic|diagnostics|observation|measurements|analysis|"
    r"study|studies|calibration|output|outputs)(?=$|[/_.-])", re.I)
SKIP = {".git",".venv","venv","node_modules","__pycache__",
        ".next",".cache",".pytest_cache",".mypy_cache",".tox"}


def q(value):
    return urllib.parse.quote(value, safe="/-._~")


def request_json(path, token=None):
    headers = {"User-Agent":"Sophia-Public-Research-Catalog/1.0",
               "Accept":"application/vnd.github+json",
               "X-GitHub-Api-Version":"2022-11-28"}
    if token:
        headers["Authorization"] = "Bearer " + token
    for attempt in range(4):
        try:
            with urllib.request.urlopen(
                urllib.request.Request(API + path, headers=headers), timeout=40
            ) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            if attempt == 3 or exc.code not in (403,429,500,502,503,504):
                raise RuntimeError("GitHub HTTP %s at %s" % (exc.code,path)) from None
            pause = exc.headers.get("Retry-After")
            wait = min(60,int(pause)) if pause and pause.isdigit() else 4*(attempt+1)
            time.sleep(wait)
        except (urllib.error.URLError, TimeoutError) as exc:
            if attempt == 3:
                raise RuntimeError("GitHub connection error at %s: %s" % (path,exc)) from exc
            time.sleep(2*(attempt+1))
    raise RuntimeError("API requests exhausted")


def discover(owner, token=None):
    """Public API only; never enumerate private or connected-account sources."""
    repos = {}
    for page in range(1,1001):
        params = urllib.parse.urlencode(
            {"type":"owner","sort":"full_name","per_page":100,"page":page})
        data = request_json("/users/%s/repos?%s" % (q(owner),params),token)
        if not isinstance(data,list):
            raise RuntimeError("Repository discovery returned non-list")
        for repo in data:
            if (repo.get("private") is False
                and repo.get("visibility","public") == "public"
                and repo.get("owner",{}).get("login","").lower() == owner.lower()
                and repo.get("name")):
                repos[repo["name"]] = repo
        if len(data)<100:
            return sorted(repos.values(),key=lambda x:x["name"].casefold())
    raise RuntimeError("Repository enumeration exceeded 1000 pages")


def include(path):
    parts=path.split("/")
    return (not any(p in SKIP for p in parts)
            and not (len(parts)>1 and parts[:2]==["catalog","auto"])
            and parts[-1]!=".DS_Store")


def classify(path, repo):
    ext = Path(path.lower()).suffix
    tags = []
    if ext in DOC: tags.append("document")
    if ext in DATA or RESULT.search(path.lower()): tags.append("data_or_result")
    if ext in CODE: tags.append("reproducibility_source")
    if ext in MEDIA: tags.append("media")
    if repo.lower()=="papers" and ext in DOC: tags.append("papers_document")
    return tags or ["other"]


def tree(owner, repo, token=None):
    base="/repos/%s/%s/git/trees/" % (q(owner),q(repo["name"]))
    branch=repo.get("default_branch")
    if not branch:
        raise RuntimeError("Empty repository or missing default branch")
    data=request_json(base+q(branch)+"?recursive=1",token)
    if not data.get("truncated"):
        return data.get("tree",[]),data["sha"],"COMPLETE"

    # Bounded subtree scan for oversized repos. Preserve the explicitly
    # PARTIAL recursive response if complete fallback exceeds its budget.
    try:
        root=request_json(base+q(branch),token)
        pending=[("",root.get("tree",[]))]
        blobs=[]
        calls=0
        while pending:
            prefix,items=pending.pop()
            for item in items:
                path=prefix+item["path"]
                if item["type"]=="blob":
                    blobs.append(dict(item,path=path))
                elif item["type"]=="tree" and include(path+"/child"):
                    calls+=1
                    if calls>35:
                        print("SOPHIA_WARNING huge tree truncated "+repo["name"],flush=True)
                        return data.get("tree",[]),data["sha"],"PARTIAL_TRUNCATED"
                    subtree=request_json(base+q(item["sha"]),token)
                    if subtree.get("truncated"):
                        return data.get("tree",[]),data["sha"],"PARTIAL_TRUNCATED"
                    pending.append((path+"/",subtree.get("tree",[])))
        return blobs,root["sha"],"COMPLETE_SUBTREE_FALLBACK"
    except Exception as exc:
        print("SOPHIA_WARNING subtree fallback error: "+str(exc),flush=True)
        return data.get("tree",[]),data["sha"],"PARTIAL_TRUNCATED"


def record(owner, repo, blob):
    path=blob["path"]
    return {
        "path":path, "blob_sha":blob.get("sha"),
        "size_bytes":blob.get("size",0),
        "kinds":classify(path,repo["name"]),
        "url":"https://github.com/%s/%s/blob/%s/%s" % (
            owner,q(repo["name"]),q(repo["default_branch"]),q(path)),
        "review_status":"UNREVIEWED_METADATA_ONLY"
    }


def write(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")


def scan(owner,repo,token,outdir):
    blobs,sha,fallback=tree(owner,repo,token)
    files=sorted((record(owner,repo,f) for f in blobs if
                  f.get("type")=="blob" and include(f["path"])),
                 key=lambda f:f["path"].casefold())
    categories=("document","papers_document","data_or_result",
                "reproducibility_source","media","other")
    counts={c:sum(c in item["kinds"] for item in files) for c in categories}
    details={"repository":repo["full_name"],
             "default_branch":repo["default_branch"],
             "tree_sha":sha,
             "visibility":"public",
             "status":"COMPLETE_SUBTREE_FALLBACK" if fallback else "COMPLETE",
             "content_review":"NONE",
             "files":files}
    write(outdir/"repos"/(repo["name"]+".json"),details)
    return {"name":repo["name"],"repository":repo["full_name"],
            "default_branch":repo["default_branch"],"tree_sha":sha,
            "files":len(files),"counts":counts,"status":details["status"],
            "inventory":"repos/%s.json" % q(repo["name"]),
            "fork":bool(repo.get("fork")),"archived":bool(repo.get("archived"))}


def md_link(label,url):
    return "[%s](%s)" % (label.replace("|",r"\|"),url)


def publish(owner,dest,token):
    generated_at=dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    repos=discover(owner,token)
    if not repos:
        raise RuntimeError("Zero public repos returned; preserving old catalogue")
    old={}
    if (dest/"manifest.json").exists():
        try: old=json.loads((dest/"manifest.json").read_text(encoding="utf-8"))
        except ValueError: old={}
    old_rows={r["name"]:r for r in old.get("repositories",[])}
    rows=[];errors=[]
    expected=set()
    for i,repo in enumerate(repos,1):
        name=repo["name"]; expected.add(name+".json")
        try:
            rows.append(scan(owner,repo,token,dest))
        except Exception as exc:
            msg=str(exc)[:500]
            errors.append({"repository":repo["full_name"],"error":msg})
            cached=dest/"repos"/(name+".json")
            if name in old_rows and cached.exists():
                rows.append(dict(old_rows[name],status="STALE_PREVIOUS_SNAPSHOT",
                                 scan_error=msg))
            else:
                rows.append({"name":name,"repository":repo["full_name"],
                             "files":0,"counts":{},"status":"INCOMPLETE",
                             "scan_error":msg,"inventory":None})
        if i%25==0:
            print("Sophia scanned %d/%d repositories; %d issues" %
                  (i,len(repos),len(errors)),flush=True)
    if (dest/"repos").exists():
        for file in (dest/"repos").glob("*.json"):
            if file.name not in expected:
                file.unlink()
    categories=("document","papers_document","data_or_result",
                "reproducibility_source","media","other")
    totals={c:sum(r["counts"].get(c,0) for r in rows) for c in categories}
    totals["files"]=sum(r["files"] for r in rows)
    present={r["name"] for r in rows}
    if "papers" not in present:
        errors.append({"repository":owner+"/papers","error":"papers not publicly discoverable"})
    manifest={
      "schema_version":"1.0.0",
      "name":"Sophia's public publications, documents, results and source catalogue",
      "generated_at_utc":generated_at,
      "scope":"All PUBLIC GitHub repositories owned by "+owner+"; all non-vendor/default-branch files",
      "excluded":"Private repositories, connected Drive/Gmail/Library files, non-default branches, unlisted releases",
      "evidence_rule":"METADATA ONLY; DO NOT infer PASS, theorem verification or physical reality from titles",
      "repositories_found":len(repos),
      "complete_repositories":sum(r["status"].startswith("COMPLETE") for r in rows),
      "stale_repositories":sum(r["status"]=="STALE_PREVIOUS_SNAPSHOT" for r in rows),
      "incomplete_repositories":sum(r["status"]=="INCOMPLETE" for r in rows),
      "coverage_complete":not bool(errors),
      "totals":totals,"errors":errors,"repositories":rows
    }
    write(dest/"manifest.json",manifest)
    base=[
      "# Sophia's Universal Catalogue — Public Source Snapshot","",
      "**Generated:** "+generated_at+" UTC  ",
      "**Scope:** ALL discoverable PUBLIC owner repositories. Private repositories "
      "and connected cloud files are excluded.  ",
      "**Scientific caution:** Metadata only. Filename claims of PASS, proof, "
      "verification or discovery have NOT been reviewed.","",
      "**Discovered:** %d repositories; %d complete; %d stale; %d incomplete." %
      (len(repos),manifest["complete_repositories"],manifest["stale_repositories"],
       manifest["incomplete_repositories"]),
      "**Inventory:** %d files, %d documents, %d data/result candidates, "
      "%d reproducibility-source candidates." %
      (totals["files"],totals["document"],totals["data_or_result"],
       totals["reproducibility_source"]),
      "",
      "[Machine-readable manifest](manifest.json) · [All files in papers](papers.md) · "
      "[Searchable catalogue](../index.html)","",
      "| Repository | All files | Documents | Results/data | Code/proof source | Coverage | Inventory |",
      "|---|---:|---:|---:|---:|---|---|"]
    for row in rows:
        link=md_link(row["name"],"https://github.com/"+row["repository"])
        path=md_link("Files",row["inventory"]) if row.get("inventory") else "Unavailable"
        cnt=row["counts"]
        base.append("| %s | %d | %d | %d | %d | %s | %s |" %
                    (link,row["files"],cnt.get("document",0),
                     cnt.get("data_or_result",0),
                     cnt.get("reproducibility_source",0),row["status"],path))
    if errors:
        base.extend(["","## Explicit coverage gaps",""])
        base.extend("- %s: %s" % (e["repository"],e["error"]) for e in errors)
    (dest/"overview.md").write_text("\n".join(base)+"\n",encoding="utf-8")
    plist=[
      "# Sophia's Complete Public Papers Document Shelf","",
      "**Snapshot:** "+generated_at,
      "**Evidence:** file inventory, not a journal peer-review or publication-status assertion.",
      "",
      "[Universal catalogue](overview.md) · [Source repository](https://github.com/"+owner+"/papers)",
      "", "| Document path | Bytes | Repository file |",
      "|---|---:|---|"]
    pr=next((r for r in rows if r["name"]=="papers" and r.get("inventory")),None)
    if pr:
        shard=json.loads((dest/pr["inventory"]).read_text(encoding="utf-8"))
        selected=[f for f in shard["files"] if "document" in f["kinds"]]
        for f in selected:
            plist.append("| %s | %d | %s |" %
                         (f["path"].replace("|",r"\|"),f["size_bytes"],
                          md_link("Open",f["url"])))
        plist.extend(["","**Document-like files listed:** "+str(len(selected))])
    else:
        plist.extend(["| UNRESOLVED: papers inventory missing | - | - |"])
    (dest/"papers.md").write_text("\n".join(plist)+"\n",encoding="utf-8")
    print(json.dumps({
        "coverage":"COMPLETE" if not errors else "PARTIAL_WITH_ERRORS",
        "repositories":len(repos),"documents":totals["document"],
        "results":totals["data_or_result"],"files":totals["files"],
        "papers_documents":(pr or {}).get("counts",{}).get("papers_document",0),
        "errors":len(errors)},sort_keys=True))
    return 0 if not errors else 2


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--owner",default="enuminous")
    p.add_argument("--dest",default="catalog/auto")
    args=p.parse_args()
    if not re.fullmatch(r"[a-zA-Z0-9-]{1,39}",args.owner):
        p.error("Invalid GitHub owner")
    dest=Path(args.dest)
    if dest.parts!=("catalog","auto"):
        p.error("Only catalog/auto may be generated")
    return publish(args.owner,dest,os.getenv("GH_TOKEN") or os.getenv("GITHUB_TOKEN"))


if __name__=="__main__":
    try: sys.exit(main())
    except Exception as exc:
        print("SOPHIA_FATAL: %s" % exc,file=sys.stderr)
        raise
