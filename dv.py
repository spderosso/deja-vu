#!/usr/bin/env python

import pandas as pd
import seaborn as sns
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics.pairwise import pairwise_distances

from scipy.cluster.hierarchy import dendrogram, linkage
import scipy.spatial.distance as ssd

import os, shutil

import itertools
import math

import argparse
import json


CLICHE_USAGE_FILE = "cliche-usage.png"
CLICHE_USAGE_TRANSPOSE_FILE = "cliche-usage-transpose.png"
CLICHE_CORR_FILE = "cliche-corr-matrix.png"
APP_SIMILARITY_FILE = "app-similarity.png"
APP_DENDOGRAM_FILE = "app-dendrogram.png"
CLICHE_DEV_FILE = "cliche-dev.png"
CLICHE_DEV_DF_FILE = "cliche-dev.pickle"
OUT_DIR = "out"

DPI = 900

parser = argparse.ArgumentParser(description="Analyze catalog usage")
parser.add_argument("appsdir", help="apps directory")
parser.add_argument("-x", "--exclude", nargs='+', help="apps to exclude")
parser.add_argument(
  "-o", "--out", default=OUT_DIR, help="where to output figs (default: out)")


def out(fp):
  return os.path.join(OUT_DIR, fp)

def get_data(appsdir, exclude):
  usageData = {}
  usedCatalog = set()
  for f in os.listdir(appsdir):
    if exclude and f in exclude:
      continue
    app_path = os.path.join(appsdir, f)
    if os.path.isdir(app_path):
      dvconfig_path = os.path.join(app_path, "dvconfig.json")
      if not os.path.exists(dvconfig_path):
        print("Dir " + f + " has no dvconfig file")
        continue
      dvconfig = json.load(open(dvconfig_path))
      usageData[dvconfig["name"]] = []
      uc = dvconfig["usedCliches"]
      for alias in uc.keys():
        cliche = uc[alias]["name"] if "name" in uc[alias] else alias
        usedCatalog.add(cliche)
        usageData[dvconfig["name"]].append(cliche)

  usageTable = {}
  for app in usageData.keys():
    usageTable[app] = {}
    for cliche in usedCatalog:
      usageTable[app][cliche] = usageData[app].count(cliche)

  return pd.DataFrame(usageTable)

def main():
  args = parser.parse_args()
  print ("Processing apps from: " + args.appsdir)
  print ("Output dir: " + args.out)
  df = get_data(args.appsdir, args.exclude)

  print("# Cliche Types")
  print(df.astype(bool).sum(axis=0))
  print(df.astype(bool).sum(axis=0).describe())
  print("# Cliche Instances")
  print(df.sum(axis=0))
  print(df.sum(axis=0).describe())

  print("# Apps")
  print(df.transpose().astype(bool).sum(axis=0))
  print(df.transpose().astype(bool).sum(axis=0).describe())
  print("# Instances")
  print(df.transpose().sum(axis=0))
  print(df.transpose().sum(axis=0).describe())

  if os.path.exists(OUT_DIR):
    shutil.rmtree(OUT_DIR)
  os.makedirs(OUT_DIR)

  cliche_usage_heatmap(df)
  cliche_usage_heatmap(df, transpose=True)
  jac_sim = jaccard_similarity_heatmap(df)
  cliche_corr_heatmap(df)
  app_dendogram(jac_sim)
  cliche_dev(df)


def cliche_usage_heatmap(df, transpose=False):
    if transpose:
      figsize = (7, 5)
      cu = df.transpose()
      xlabel = "cliché"
      ylabel = "app"
      fp = out(CLICHE_USAGE_TRANSPOSE_FILE)
    else:
      figsize = (6, 7)
      cu = df
      xlabel = "app"
      ylabel = "cliché"
      fp = out(CLICHE_USAGE_FILE)
    plt.figure(figsize=figsize)
    plot = sns.heatmap(
        cu, annot=True, square=True, cmap="YlGnBu", linewidths=.5, cbar=False)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    plt.tight_layout()
    plt.savefig(fp, dpi=DPI)
    return df


def jaccard_similarity_heatmap(df):
    # this one is counting the # of zeroes. todo: don't count them?
    # also need to think about what to do if cliche is used more than once

    # there's no pairwise version of the jaccard similarity score
    # https://stackoverflow.com/questions/37003272/
    jac_sim = 1 - pairwise_distances(df.T, metric = "hamming")
    jac_sim = pd.DataFrame(jac_sim, index=df.columns, columns=df.columns)
    plt.figure(figsize=(6, 6))
    plot = sns.heatmap(
        jac_sim, annot=True, square=True, cmap="YlGnBu", linewidths=.5)
    plt.xlabel("app")
    plt.ylabel("app")
    plt.tight_layout()
    plt.savefig(out(APP_SIMILARITY_FILE), dpi=DPI)
    return jac_sim


def cliche_corr_heatmap(df):
    corr_matrix = df.T.corr()
    plt.figure(figsize=(12, 10))
    plot = sns.heatmap(
        corr_matrix, annot=True, square=True, cmap="YlGnBu", fmt=".2f",
        linewidths=.5)
    plt.xlabel("cliché")
    plt.ylabel("cliché")
    plt.tight_layout()
    plt.savefig(out(CLICHE_CORR_FILE), dpi=DPI)
    return corr_matrix


# on the x-axis are the cliches
# on the y-axis you see the distance. The number on the red dots show the
# distance of the horizontal line where they are on
# Starting on each cliche at the bottom you see a vertical line up to a
# horizontal line. The height of that horizontal line tells you the distance at
# which this cliche was merged into another cliche or cluster. The lower the
# distance the more similar the cliches/clusters are.
def app_dendogram(jac_sim):
    # from: https://stackoverflow.com/questions/11917779/
    def augmented_dendrogram(*args, **kwargs):
      ddata = dendrogram(*args, **kwargs)
      if not kwargs.get("no_plot", False):
          for i, d in zip(ddata["icoord"], ddata["dcoord"]):
              x = 0.5 * sum(i[1:3])
              y = d[1]
              plt.plot(x, y, "ro")
              plt.annotate(
                  "%.3g" % y, (x, y), xytext=(0, -8),
                  textcoords="offset points", va="top", ha="center")
      return ddata

    jac_dist = 1 - jac_sim
    dist_array = ssd.squareform(1 - jac_sim)
    Z = linkage(dist_array)
    plt.figure(figsize=(4, 5))
    dn = augmented_dendrogram(Z, labels=jac_dist.columns, leaf_rotation=90)
    plt.xlabel("app")
    plt.tight_layout()
    plt.savefig(out(APP_DENDOGRAM_FILE), dpi=DPI)


def cliche_dev(df):
    try:
        ret = pd.read_pickle(CLICHE_DEV_DF_FILE)
    except IOError:
        ret = compute_cliche_dev(df)
        ret.to_pickle(CLICHE_DEV_DF_FILE)

    plt.figure(figsize=(60, 50))
    ret["order"] += 1
    bp = ret.boxplot(
      column="cliches_developed_count", by="order")
    bp.get_figure().suptitle('')
    bp.set_ylabel('# of clichés developed')
    plt.title('')
    plt.tight_layout()
    plt.savefig(out(CLICHE_DEV_FILE), dpi=DPI)


def compute_cliche_dev(df):
    def get_permutation_name(permutation):
      return "->".join(permutation)

    df_shape = df.shape
    num_of_cliches = df_shape[0]
    num_of_apps = df_shape[1]
    total_permutations = math.factorial(num_of_apps)

    data = []
    for idx, permutation in enumerate(itertools.permutations(df.columns)):
        print("Looking at permutation {0} of {1}".format(
            idx, total_permutations))
        permutation_name = get_permutation_name(permutation)
        cliches_developed = [False] * num_of_cliches
        for order, app in enumerate(permutation):
            cliches_developed_count = 0
            for cliche, usage in enumerate(df[app]):
                if usage > 0:
                    if not cliches_developed[cliche]:
                        cliches_developed[cliche] = True
                        cliches_developed_count += 1
            data.append([permutation_name, app, order, cliches_developed_count])

    return pd.DataFrame(
        columns=["permutation", "app", "order", "cliches_developed_count"],
        data=data)


if __name__ == "__main__":
    main()
