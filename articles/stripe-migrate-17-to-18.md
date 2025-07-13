---
title: "Stripe node SDK v17→v18アップグレードでのハマりどころ"
emoji: "🤑"
type: "tech"
topics: ["Stripe","AIコーディング","従量課金","Node.js","サブスクリプション"]
published: true

---

## はじめに


2025年4月に`2025-03-31.basil`に対応したStripe Node.js SDK v18がリリースされましたが、多くの破壊的変更が含まれています。実際にv17からv18にアップグレードする際にいくつかの問題に詰まったので、その解決方法をメモとして共有します。AIコーディングでも役に立てられるよう意識して記事にしました。


## 主な破壊的変更


### 1. `current_period_start`と`current_period_end`の移動


#### 問題


`Subscription`オブジェクトから`current_period_start`と`current_period_end`プロパティが削除されました。


```typescript
// v17では動作
const periodStart = subscription.current_period_start;
const periodEnd = subscription.current_period_end;
```


#### 解決方法


これらのプロパティは`SubscriptionItem`レベルに移動しました。


```typescript
// v18での正しい書き方
const periodStart = subscription.items.data[0].current_period_start;
const periodEnd = subscription.items.data[0].current_period_end;
```


### 2. Invoice Preview APIの変更


#### 問題


`stripe.invoices.retrieveUpcoming()`メソッドが削除されました。


```typescript
// v17では動作
const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
  customer: customerId,
  subscription: subscriptionId,
  subscription_items: [
    {
      id: subscriptionItemId,
      price: newPriceId,
    },
  ],
});
```


#### 解決方法


新しい`createPreview()`メソッドが提供され、パラメータ構造も変更されています。


```typescript
// v18での正しい書き方
const upcomingInvoice = await stripe.invoices.createPreview({
  customer: customerId,
  subscription: subscriptionId,
  subscription_details: {
    items: [
      {
        id: subscriptionItemId,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
  },
});
```


### 3. 比例按配（日割り計算・プロレーション計算）の変更


#### 問題


`InvoiceLineItem`から`proration`プロパティが削除されました。


```typescript
// v17では動作
const prorationAmount = invoice.lines.data
  .filter((line) => line.proration)
  .reduce((sum, line) => sum + line.amount, 0);
```


#### 解決方法


プロレーション情報は`parent.subscription_item_details.proration`に移動しました。


```typescript
// v18での正しい書き方
const prorationAmount = invoice.lines.data
  .filter((line) => {
    return line.parent?.subscription_item_details?.proration === true;
  })
  .reduce((sum, line) => sum + line.amount, 0);
```


## さいごに：AIコーディングにおける注意点


Claude codeに更新作業を当初任せていましたが、放っておくと勝手に型アサーションを使って「deprecatedなフィールドは実際はあります」って言って出来たフリをしてきます。1, 2は適切な参考資料を繰り返し与えて参照するように指示することで解決できるようになってくれましたが、3は最後まで自力では解決できませんでした。結局、実際に送られてくるデータをデバッグ出力して読ませることで、parentの中にデータが移動したことに気づいてくれました。


この記事の存在によって、一度の参照でアップデートできるようになってくれるといいなという思いも込めて、記事に残しました。ぜひAIに読ませてみてください。


## 参考資料


https://github.com/stripe/stripe-node/releases/tag/v18.0.0


https://docs.stripe.com/changelog/basil#2025-03-31.basil


https://github.com/stripe/stripe-node/wiki/Migration-guide-for-v18


https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end


https://docs.stripe.com/changelog/basil/2025-03-31/checkout-legacy-subscription-upgrade


https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-total-count-expansion


https://stripe.com/blog/introducing-stripes-new-api-release-process


https://docs.stripe.com/billing/subscriptions/prorations#preview-proration


コピー用


[https://github.com/stripe/stripe-node/releases/tag/v18.0.0
](https://github.com/stripe/stripe-node/releases/tag/v18.0.0)[https://docs.stripe.com/changelog/basil#2025-03-31.basil
](https://docs.stripe.com/changelog/basil#2025-03-31.basil)[https://github.com/stripe/stripe-node/wiki/Migration-guide-for-v18
](https://github.com/stripe/stripe-node/wiki/Migration-guide-for-v18)[https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end
](https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end)[https://docs.stripe.com/changelog/basil/2025-03-31/checkout-legacy-subscription-upgrade
](https://docs.stripe.com/changelog/basil/2025-03-31/checkout-legacy-subscription-upgrade)[https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-total-count-expansion
](https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-total-count-expansion)[https://stripe.com/blog/introducing-stripes-new-api-release-process
](https://stripe.com/blog/introducing-stripes-new-api-release-process)[https://docs.stripe.com/billing/subscriptions/prorations#preview-proration](https://docs.stripe.com/billing/subscriptions/prorations#preview-proration)

