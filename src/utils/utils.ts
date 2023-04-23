import * as vscode from "vscode";
import { AxiosError } from "axios";
import { ChatCompletionRequestMessageRoleEnum, OpenAIApi } from "openai";
import { readdirSync, statSync } from "fs";

/**
 * 共通のモジュール
 */

/**
 * Axiosエラーか判定
 * @param error
 * @returns
 */
export const isAxiosError = (error: unknown): error is AxiosError => {
  return (error as AxiosError)?.isAxiosError === true;
};

/**
 * APIキーの保存
 * @param yourKey
 */
export const save_api_key = async (yourKey: string) => {
  await vscode.workspace
    .getConfiguration("create-readme-openai")
    .update("apiKey", yourKey, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage("API Key saved to settings.");
};

/**
 * README作成関数
 * @param content
 * @param model
 * @param role
 * @returns
 */
export const generateReadme = async (
  content: string,
  model = "gpt-3.5-turbo",
  role: ChatCompletionRequestMessageRoleEnum = "user",
  openai: OpenAIApi | undefined
) => {
  try {
    const response = await openai?.createChatCompletion({
      model: model,
      messages: [{ role: role, content: content }],
    });

    const answer = response?.data.choices[0].message?.content;
    return { success: true, content: answer };
  } catch (error) {
    if (isAxiosError(error) && error?.response?.status === 403) {
      // 通信失敗時
      return {
        success: false,
        content: "An error occurred during the request. Please try again.",
      };
    } else {
      // APIキーが違うなど
      return {
        success: false,
        content:
          "An error occurred during the request. Plese check your API key and model",
      };
    }
  }
};

/**
 * フォルダの配下のtreeを取得
 * @param path パス
 * @returns
 */
export const readDirRecursive = (
  path: string
): { label: string; nodes?: any[] } => {
  const stats = statSync(path);

  if (stats.isDirectory()) {
    const folderName = path.split("/").pop() as string;
    const children = readdirSync(path).map((child) =>
      readDirRecursive(`${path}/${child}`)
    );

    return { label: folderName, nodes: children };
  } else {
    return { label: path.split("/").pop() as string };
  }
};

/**
 * フォルダ選択
 * @returns
 */
export const selectFolder = async (): Promise<string | undefined> => {
  const options: vscode.OpenDialogOptions = {
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
  };

  const folderUri = await vscode.window.showOpenDialog(options);

  if (folderUri && folderUri.length > 0) {
    return folderUri[0].fsPath;
  }

  return undefined;
};

/**
 * ファイル選択
 * @returns
 */
export const selectFile = async (): Promise<string | undefined> => {
  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    openLabel: "Select",
    filters: {
      all_files: ["*"],
    },
  };

  const fileUri = await vscode.window.showOpenDialog(options);

  if (fileUri && fileUri.length > 0) {
    return fileUri[0].fsPath;
  }

  return undefined;
};
interface TreeNode {
  label: string;
  nodes?: TreeNode[];
}

export const printTree = (tree: TreeNode, depth = 0, isLast = true): string => {
  const LINE = '│  ';
  const BRANCH = isLast ? '└──' : '├──';
  const indent = ' '.repeat(depth * 4);
  let treeStr = `${indent}${BRANCH}${tree.label}\n`;

  if (tree.nodes) {
    const lastIndex = tree.nodes.length - 1;
    tree.nodes.forEach((node, index) => {
      const isLastNode = index === lastIndex;
      treeStr += printTree(node, depth + 1, isLastNode);
      if (!isLastNode) {
        treeStr += `${indent}${isLast ? '   ' : LINE}`;
      }
    });
  }
  return treeStr;
};