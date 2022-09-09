# TADSAM:A Time-Aware Dynamic Self-Attention Model for Next Point-of-Interest Recommendation

## 1. Abstract

近年来，兴趣点（POI）推荐主要面临两个挑战：1）随着时间的变化，用户的历史行为呈现出多样性和复杂性；2）由于用户轨迹数据的稀疏性，很难捕捉到用户在相应时间的偏好。 本文提出了一种时间感知动态自我注意模型 TADSAM 来预测用户未来的下一个决策活动。 首先，我们使用**扩展的自注意机制**来处理用户复杂的签到记录。 其次，考虑到时间的影响，我们将用户签到记录划分为不同的时间窗口，并开发了一种**个性化的权重计算方法**，以利用用户行为的时间模式。

## 2. Problem Formulation

- 我们用 $U$ 定义用户集合，用 $L$ 定义位置集合。 每个用户 $u_{i}$ 的签到记录是一个三元组 $r_{i} = (u_{i}, l_{i}, t_{i})$ 。 

- 我们用 $\operatorname{Traj}\left(u_{i}\right)=\left\{r_{1}, r_{2}, \ldots, r_{m_{i}}\right\}$ 来表示每个用户的签到轨迹。我们将每个用户的轨迹序列转换为固定的序列长度，即 $\operatorname{Seq}\left(u_{i}\right)=\left\{r_{1}, r_{2}, \ldots, r_{k}\right\}$，其中 $k$ 表示我们考虑的最大长度。 

- 此外，我们将两个位置之间的时间间隔作为相对时间矩阵的元素。 每个元素 $\Delta_{i j}^{t}$ 表示为 $\Delta_{i j}^{t}=\left|t_{i}-t_{j}\right|$ ：

  

## 3. The Model Architecture



### 3.1 Embedding Layer

