// マーケティングタグ注入設定。
// Base.astroがACDL初期化の後・他のどのスクリプトよりも前にこの内容を<head>へ出力する。
export interface SiteConfig {
  tags: {
    // 外部スクリプト(タグマネージャー本体等)
    scripts: Array<{ src: string; async?: boolean; defer?: boolean }>;
    // GTMスニペット等、インラインで貼るコード片(<script>タグの中身の文字列)
    inlineHead: string[];
  };
  // ログインダミーシステム。会員ID/属性の管理、ログイン/ログアウト、
  // ログイン状態オーバーレイ、ACDLへのuser名前空間連携を一括でOn/Offする。既定はOff。
  member: {
    enabled: boolean;
  };
}

const siteConfig: SiteConfig = {
  tags: {
    scripts: [],
    inlineHead: [],
  },
  member: {
    // astro-tableはマーケティングツール検証用サイトなので、ここでは実際にOnにする。
    // 新規サイトへテンプレートとして展開する際は、必要に応じてfalseに戻す。
    enabled: true,
  },
};

export default siteConfig;
