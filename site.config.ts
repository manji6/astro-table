import type { HTMLAttributes } from 'astro/types';

// サイト共通設定。Base.astroがhead.linksを先に、tagsをACDL初期化の後に出力する。
export interface SiteConfig {
  // Webフォント・favicon等のlink要素。省略時は追加しない。
  head?: {
    links?: Array<HTMLAttributes<'link'>>;
  };
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
  // カート・会員・お気に入り等、localStorageキーの先頭に付けるサイト固有のプレフィックス。
  // サイトごとに固有の名前を設定する(このテンプレートを使う側のサイト名等)。
  storagePrefix: string;
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
  storagePrefix: 'astro-table',
};

export default siteConfig;
