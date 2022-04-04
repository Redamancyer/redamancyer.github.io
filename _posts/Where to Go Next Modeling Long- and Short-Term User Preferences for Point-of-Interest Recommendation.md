# Where to Go Next: Modeling Long- and Short-Term User Preferences for Point-of-Interest Recommendation

# Abstract

现有的基于RNN的方法在对用户的短期偏好进行建模时，要么忽略了用户的长期偏好，要么忽略了最近访问的POI之间的地理关系，从而导致推荐结果不可靠。我们提出了一种新的方法，称为长期和短期偏好建模（LSTPM），用于下一个 POI 推荐。

# Problem Formulation

对于用户u，给定历史轨迹s<sub>1</sub>， s<sub>2</sub>，...， s<sub>n-1</sub>（ 这里每一个历史轨迹为用户一天的签到序列，如当前轨迹s<sub>n</sub>=l<sub>1</sub>，l<sub>1</sub>，...，l<sub>t-1</sub> )，求该用户在下一个时间戳t访问的POI。

# The Proposed Model

![image-20220309081334556](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309081334556.png)

## Long-Term Preference Modeling

- 使用一层LSTM将每个历史序列中的每个POI进行编码

![image-20220309142715770](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309142715770.png)

​		其中 ht 是 LSTM 的隐藏状态，xt ∈ Rd×1 是随机初始化并将在网络中训练的第 t 个 POI  的 d 维嵌入向量。

- 划分时间片，具体来说，我们将一周划分为48个时段（工作日24小时，周末24小时）。将每个POI对号入座放到对应的时间片里，这里不区分具体用户，并根据公式对不同时间片之间的差异性进行计算。

![image-20220309143213990](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309143213990.png)

- 对于每一个历史轨迹，根据划分得到时间片轨迹，并计算每个时间片与目标时间片之间的差异性并做归一化形成权值，并得到最后的轨迹向量。

![image-20220309143744757](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309143744757.png)

- 对于当前轨迹，使用单独的LSTM进行显式的建模最近访问的POI，S<sub>n</sub>的加权操作被平均值取代。

![image-20220309144149195](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309144149195.png)

- 根据每个历史轨迹与当前轨迹的相似性计算权值，并根据权值计算长期偏好的表示。

  其中C(S)是归一化因子，g生成s<sub>h</sub>的表示，f计算当前轨迹和历史轨迹的亲和度。

![image-20220309144628994](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309144628994.png)

![image-20220309144648750](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309144648750.png)

- 得到的偏好向量只考虑了当前轨迹与历史轨迹的时间相似性，没有考虑当前位置与历史轨迹中位置的相似性。

  计算当前位置与历史轨迹的位置相似性，每条历史轨迹的位置粗略的定义为各签到位置的中心点。

![image-20220309163153955](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309163153955.png)

![image-20220309195353988](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309195353988.png)

![image-20220309195805843](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309195805843.png)

## Short-Term Preference Modeling

![image-20220309203938400](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309203938400.png)

![image-20220309204320874](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309204320874.png)

![image-20220309204410253](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309204410253.png)

![image-20220309204424402](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309204424402.png)

## Prediction

![image-20220309204445467](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309204445467.png)

![image-20220309204458730](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309204458730.png)

# Experiments

## Baselines and Settings

  嵌入维度和隐藏状态设置为 500， 我们模型中的所有参数都使用梯度下降优化算法 Adam 进行了优化，批量大小为 32，学习率为 0.0001

![image-20220309204045436](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309204045436.png)

## Performance comparison on two datasets

最好的结果以粗体突出显示，次优的结果用下划线表示。

![image-20220309204110140](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309204110140.png)

##   Analysis on Key Components in LSTPM

  - LSTPM-L：此版本删除了 LSTPM 的短期组件，仅使用长期组件。 
  
  - LSTPM-S：此版本删除了 LSTPM 的长期组件，仅使用短期组件。

![image-20220309204147772](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309204147772.png)

##   Analysis on Impact of History Length

![image-20220309204206291](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309204206291.png)

## Analysis on Effectiveness of Geo-Dilated LSTM

![image](https://redamancyer.xyz/_imgs/Where%20to%20Go%20Next%20Modeling%20Long-%20and%20Short-Term%20User%20Preferences%20for%20Point-of-Interest%20Recommendation.assets/image-20220309204218311.png)


  

  

  
